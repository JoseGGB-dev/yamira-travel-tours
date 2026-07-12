const pool = require('../config/db');
const { contarAsientos, calcularMontoReserva } = require('../utils/reservaUtils');

function enriquecerReserva(reserva) {
  if (!reserva) return reserva;
  reserva.cantidad_asientos = contarAsientos(reserva.asiento);
  reserva.monto_total = calcularMontoReserva(reserva.precio, reserva.asiento);
  return reserva;
}

async function obtenerReservaCompleta(codigo) {
  const [rows] = await pool.query(`
    SELECT res.*, v.fecha, v.hora, v.precio, r.origen, r.destino
    FROM reservas res
    INNER JOIN viajes v ON res.viaje_id = v.id
    INNER JOIN rutas r ON v.ruta_id = r.id
    WHERE res.codigo_reserva = ?
  `, [codigo]);
  return enriquecerReserva(rows[0] || null);
}

exports.mostrarPago = async (req, res) => {
  const { codigo } = req.params;
  try {
    const reserva = await obtenerReservaCompleta(codigo);
    if (!reserva) return res.status(404).send('Reserva no encontrada');

    if (reserva.estado === 'cancelado') {
      return res.status(400).send('Esta reserva fue cancelada y no puede pagarse.');
    }
    if (reserva.estado === 'pagado') {
      return res.redirect(`/pago/${codigo}/enviado`);
    }

    res.render('pago', { reserva, error: null });
  } catch (error) {
    console.error('Error al mostrar pantalla de pago:', error);
    res.status(500).send('Error al cargar la pantalla de pago');
  }
};

exports.registrarPago = async (req, res) => {
  const { codigo } = req.params;
  const { metodo, codigo_operacion } = req.body;

  try {
    const reserva = await obtenerReservaCompleta(codigo);
    if (!reserva) return res.status(404).send('Reserva no encontrada');

    if (!req.file) {
      return res.render('pago', { reserva, error: 'Debes adjuntar una foto o captura del voucher.' });
    }
    if (!metodo) {
      return res.render('pago', { reserva, error: 'Debes seleccionar un metodo de pago.' });
    }

    const rutaVoucher = '/uploads/vouchers/' + req.file.filename;

    await pool.query(
      `INSERT INTO pagos (reserva_id, metodo, monto, estado, codigo_operacion, voucher)
       VALUES (?, ?, ?, 'pendiente', ?, ?)`,
      [reserva.id, metodo, reserva.monto_total, codigo_operacion || null, rutaVoucher]
    );

    res.redirect(`/pago/${codigo}/enviado`);
  } catch (error) {
    console.error('Error al registrar el pago:', error);
    res.status(500).send('Error al registrar el pago. Verifica el formato del archivo (JPG, PNG o PDF, maximo 5MB).');
  }
};

exports.mostrarPagoEnviado = async (req, res) => {
  const { codigo } = req.params;
  try {
    const reserva = await obtenerReservaCompleta(codigo);
    if (!reserva) return res.status(404).send('Reserva no encontrada');

    const [pagosRows] = await pool.query(
      'SELECT * FROM pagos WHERE reserva_id = ? ORDER BY id DESC LIMIT 1',
      [reserva.id]
    );
    const pago = pagosRows[0];

    const mensaje =
      `Hola, soy ${reserva.nombre_cliente}. Realice el pago de mi reserva ${reserva.codigo_reserva} ` +
      `(${reserva.origen} -> ${reserva.destino}, ${new Date(reserva.fecha).toLocaleDateString('es-PE')} ${reserva.hora}). ` +
      `Asientos: ${reserva.asiento}. Monto: S/ ${Number(reserva.monto_total).toFixed(2)} via ${pago ? pago.metodo : ''}.`;

    const linkWhatsapp = `https://wa.me/${process.env.WHATSAPP_ADMIN}?text=${encodeURIComponent(mensaje)}`;

    res.render('pago-enviado', { reserva, pago, linkWhatsapp });
  } catch (error) {
    console.error('Error al mostrar pantalla final de pago:', error);
    res.status(500).send('Error al cargar la pantalla');
  }
};
