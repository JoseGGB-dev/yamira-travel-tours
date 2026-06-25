const pool = require('../config/db');

// Genera un código de reserva simple. Lo perfeccionaremos en la Fase 2.
function generarCodigoReserva() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CJT-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// Muestra el formulario de reserva para un viaje específico
exports.mostrarFormulario = async (req, res) => {
    const viajeId = req.params.id;
    try {
        const [viajeRows] = await pool.query(`
      SELECT v.*, r.origen, r.destino
      FROM viajes v
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE v.id = ?
    `, [viajeId]);

        if (viajeRows.length === 0) {
            return res.status(404).send('Viaje no encontrado');
        }

        const viaje = viajeRows[0];

        const [reservasRows] = await pool.query(
            `SELECT asiento FROM reservas WHERE viaje_id = ? AND estado != 'cancelado'`,
            [viajeId]
        );
        const asientosOcupados = reservasRows.map(r => r.asiento);

        res.render('reservar', { viaje, asientosOcupados, error: null });
    } catch (error) {
        console.error('Error al mostrar formulario de reserva:', error);
        res.status(500).send('Error al cargar el formulario');
    }
};

// Procesa el envío del formulario y guarda la reserva
exports.crearReserva = async (req, res) => {
    const viajeId = req.params.id;
    const { nombre_cliente, dni, celular, punto_embarque, asiento } = req.body;
    const asientoNum = parseInt(asiento, 10);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // FOR UPDATE bloquea las filas leídas hasta que terminemos la transacción.
        // Esto evita que dos clientes reserven el mismo asiento al mismo tiempo.
        const [viajeRows] = await connection.query(
            'SELECT * FROM viajes WHERE id = ?', [viajeId]
        );

        if (viajeRows.length === 0) {
            await connection.rollback();
            return res.status(404).send('Viaje no encontrado');
        }
        const viaje = viajeRows[0];

        if (!asientoNum || asientoNum < 1 || asientoNum > viaje.capacidad) {
            await connection.rollback();
            if (asientoNum === 1) {
                await connection.rollback();
                return await reRenderConError(req, res, viajeId, 'El asiento 1 está reservado para el conductor.');
            }
            return await reRenderConError(req, res, viajeId, 'Debes seleccionar un asiento válido.');
        }

        const [ocupadoRows] = await connection.query(
            `SELECT id FROM reservas WHERE viaje_id = ? AND asiento = ? AND estado != 'cancelado' FOR UPDATE`,
            [viajeId, asientoNum]
        );

        if (ocupadoRows.length > 0) {
            await connection.rollback();
            return await reRenderConError(req, res, viajeId, 'Ese asiento ya fue reservado por otra persona. Elige otro.');
        }

        let codigo;
        let insertado = false;

        while (!insertado) {
            codigo = generarCodigoReserva();
            try {
                await connection.query(
                    `INSERT INTO reservas (viaje_id, nombre_cliente, dni, celular, asiento, punto_embarque, estado, codigo_reserva)
           VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
                    [viajeId, nombre_cliente, dni, celular, asientoNum, punto_embarque, codigo]
                );
                insertado = true;
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') continue; // muy improbable, generamos otro
                throw err;
            }
        }

        await connection.commit();
        res.redirect(`/confirmacion/${codigo}`);

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear la reserva:', error);
        res.status(500).send('Error al procesar la reserva');
    } finally {
        connection.release();
    }
};

// Función auxiliar para volver a mostrar el formulario con un mensaje de error
async function reRenderConError(req, res, viajeId, mensaje) {
    const [viajeRows] = await pool.query(`
    SELECT v.*, r.origen, r.destino FROM viajes v
    INNER JOIN rutas r ON v.ruta_id = r.id WHERE v.id = ?
  `, [viajeId]);
    const [reservasRows] = await pool.query(
        `SELECT asiento FROM reservas WHERE viaje_id = ? AND estado != 'cancelado'`,
        [viajeId]
    );
    const asientosOcupados = reservasRows.map(r => r.asiento);
    return res.render('reservar', { viaje: viajeRows[0], asientosOcupados, error: mensaje });
}

// Muestra la pantalla de confirmación según el código de reserva
exports.mostrarConfirmacion = async (req, res) => {
    const { codigo } = req.params;
    try {
        const [rows] = await pool.query(`
      SELECT res.*, v.fecha, v.hora, v.precio, r.origen, r.destino
      FROM reservas res
      INNER JOIN viajes v ON res.viaje_id = v.id
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE res.codigo_reserva = ?
    `, [codigo]);

        if (rows.length === 0) {
            return res.status(404).send('Reserva no encontrada');
        }

        res.render('confirmacion', { reserva: rows[0] });
    } catch (error) {
        console.error('Error al mostrar confirmación:', error);
        res.status(500).send('Error al cargar la confirmación');
    }
};