const pool = require('../config/db');
const {
  normalizarAsientos,
  serializarAsientos,
  expandirAsientosReservados,
  contarAsientos,
  calcularMontoReserva,
  validarCelularPeruano
} = require('../utils/reservaUtils');

function generarCodigoReserva() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = 'CJT-';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

function enriquecerReserva(reserva) {
  if (!reserva) return reserva;
  reserva.cantidad_asientos = contarAsientos(reserva.asiento);
  reserva.monto_total = calcularMontoReserva(reserva.precio, reserva.asiento);
  return reserva;
}

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
    const asientosOcupados = expandirAsientosReservados(reservasRows);

    res.render('reservar', { viaje, asientosOcupados, error: null, formData: {} });
  } catch (error) {
    console.error('Error al mostrar formulario de reserva:', error);
    res.status(500).send('Error al cargar el formulario');
  }
};

exports.crearReserva = async (req, res) => {
  const viajeId = req.params.id;
  const {
    nombre_cliente,
    dni,
    celular,
    punto_embarque,
    asiento,
    cantidad_asientos
  } = req.body;

  if (!validarCelularPeruano(celular)) {
    return reRenderConError(req, res, viajeId, 'El celular debe empezar con 9 y tener 9 digitos.');
  }

  const asientosSolicitados = normalizarAsientos(asiento);
  const cantidadSolicitada = Number.parseInt(cantidad_asientos, 10);

  if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada < 1) {
    return reRenderConError(req, res, viajeId, 'Debes indicar la cantidad de asientos.');
  }

  if (asientosSolicitados.length !== cantidadSolicitada) {
    return reRenderConError(req, res, viajeId, `Debes seleccionar exactamente ${cantidadSolicitada} asiento(s).`);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [viajeRows] = await connection.query(
      'SELECT * FROM viajes WHERE id = ? FOR UPDATE',
      [viajeId]
    );

    if (viajeRows.length === 0) {
      await connection.rollback();
      return res.status(404).send('Viaje no encontrado');
    }

    const viaje = viajeRows[0];
    const asientosInvalidos = asientosSolicitados.filter(
      numero => numero < 2 || numero > viaje.capacidad
    );

    if (asientosInvalidos.length > 0) {
      await connection.rollback();
      return reRenderConError(req, res, viajeId, 'Selecciona asientos validos. El asiento 1 esta reservado para el conductor.');
    }

    const [reservasRows] = await connection.query(
      `SELECT id, asiento FROM reservas WHERE viaje_id = ? AND estado != 'cancelado' FOR UPDATE`,
      [viajeId]
    );

    const asientosOcupados = expandirAsientosReservados(reservasRows);
    const asientosDuplicados = asientosSolicitados.filter(asientoNum => asientosOcupados.includes(asientoNum));

    if (asientosDuplicados.length > 0) {
      await connection.rollback();
      return reRenderConError(req, res, viajeId, `El/los asiento(s) ${asientosDuplicados.join(', ')} ya fueron reservados. Elige otros.`);
    }

    const asientoTexto = serializarAsientos(asientosSolicitados);
    let codigo;
    let insertado = false;

    while (!insertado) {
      codigo = generarCodigoReserva();
      try {
        await connection.query(
          `INSERT INTO reservas (viaje_id, nombre_cliente, dni, celular, asiento, punto_embarque, estado, codigo_reserva)
           VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
          [
            viajeId,
            String(nombre_cliente || '').trim(),
            String(dni || '').trim(),
            String(celular || '').trim(),
            asientoTexto,
            String(punto_embarque || '').trim(),
            codigo
          ]
        );
        insertado = true;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') continue;
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

async function reRenderConError(req, res, viajeId, mensaje) {
  const [viajeRows] = await pool.query(`
    SELECT v.*, r.origen, r.destino
    FROM viajes v
    INNER JOIN rutas r ON v.ruta_id = r.id
    WHERE v.id = ?
  `, [viajeId]);

  if (viajeRows.length === 0) {
    return res.status(404).send('Viaje no encontrado');
  }

  const [reservasRows] = await pool.query(
    `SELECT asiento FROM reservas WHERE viaje_id = ? AND estado != 'cancelado'`,
    [viajeId]
  );
  const asientosOcupados = expandirAsientosReservados(reservasRows);

  return res.render('reservar', {
    viaje: viajeRows[0],
    asientosOcupados,
    error: mensaje,
    formData: req.body || {}
  });
}

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

    res.render('confirmacion', { reserva: enriquecerReserva(rows[0]) });
  } catch (error) {
    console.error('Error al mostrar confirmacion:', error);
    res.status(500).send('Error al cargar la confirmacion');
  }
};
