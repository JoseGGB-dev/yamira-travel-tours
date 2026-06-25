const bcrypt = require('bcryptjs');
const pool = require('../config/db');


function formatearCelularWhatsapp(celular) {
  if (!celular) return null;

  let numero = String(celular).replace(/\D/g, '');

  // Si el cliente escribió un celular peruano de 9 dígitos, agregamos el código de país 51.
  if (numero.length === 9) {
    numero = '51' + numero;
  }

  // Si ya viene como 51987654321, se deja igual.
  if (numero.length < 10) return null;
  return numero;
}

function crearMensajePagoConfirmado(reserva) {
  const fecha = reserva.fecha
    ? new Date(reserva.fecha).toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return `✅ *Pago confirmado - Yamira Travel Tours*\n\n` +
    `Hola ${reserva.nombre_cliente}, tu pago fue confirmado correctamente.\n\n` +
    `📌 *Código de reserva:* ${reserva.codigo_reserva}\n` +
    `🚌 *Ruta:* ${reserva.origen} → ${reserva.destino}\n` +
    `📅 *Fecha:* ${fecha}\n` +
    `🕒 *Hora:* ${reserva.hora}\n` +
    `💺 *Asiento:* ${reserva.asiento}\n` +
    `📍 *Embarque:* ${reserva.punto_embarque || 'Por confirmar'}\n\n` +
    `Gracias por viajar con *Yamira Travel Tours*. Te esperamos. 🙌`;
}

// ---------- LOGIN ----------

exports.mostrarLogin = (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null });
};

exports.procesarLogin = async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admin WHERE usuario = ?', [usuario]);
    if (rows.length === 0) {
      return res.render('admin/login', { error: 'Usuario o contraseña incorrectos.' });
    }
    const admin = rows[0];
    const coincide = await bcrypt.compare(password, admin.password);
    if (!coincide) {
      return res.render('admin/login', { error: 'Usuario o contraseña incorrectos.' });
    }
    req.session.adminId = admin.id;
    req.session.adminUsuario = admin.usuario;
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error en login:', error);
    res.render('admin/login', { error: 'Error al iniciar sesión.' });
  }
};

exports.cerrarSesion = (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
};

// ---------- DASHBOARD ----------

exports.mostrarDashboard = async (req, res) => {
  const filtroEstado = req.query.estado || '';

  let sql = `
    SELECT res.*, v.fecha, v.hora, v.precio AS precio_viaje, r.origen, r.destino,
           p.metodo AS metodo_pago, p.estado AS estado_pago, p.id AS pago_id, p.voucher
    FROM reservas res
    INNER JOIN viajes v ON res.viaje_id = v.id
    INNER JOIN rutas r ON v.ruta_id = r.id
    LEFT JOIN pagos p ON p.id = (
      SELECT id FROM pagos WHERE reserva_id = res.id ORDER BY id DESC LIMIT 1
    )
  `;
  const params = [];
  if (filtroEstado) {
    sql += ' WHERE res.estado = ?';
    params.push(filtroEstado);
  }
  sql += ' ORDER BY res.fecha_registro DESC';

  try {
    const [reservas] = await pool.query(sql, params);
    const [viajes] = await pool.query(`
      SELECT v.id, v.fecha, v.hora, r.origen, r.destino, v.estado
      FROM viajes v INNER JOIN rutas r ON v.ruta_id = r.id
      ORDER BY v.fecha DESC
    `);
    res.render('admin/dashboard', { reservas, viajes, filtroEstado });
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    res.status(500).send('Error al cargar el panel');
  }
};

// ---------- VIAJES ----------

exports.mostrarNuevoViaje = async (req, res) => {
  const [rutas] = await pool.query("SELECT * FROM rutas WHERE estado = 'activa'");
  res.render('admin/nuevo-viaje', { rutas, error: null });
};

exports.crearViaje = async (req, res) => {
  const { ruta_id, fecha, hora, precio, capacidad } = req.body;
  try {
    await pool.query(
      `INSERT INTO viajes (ruta_id, fecha, hora, precio, capacidad, estado)
       VALUES (?, ?, ?, ?, ?, 'programado')`,
      [ruta_id, fecha, hora, precio, capacidad || 18]
    );
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error al crear viaje:', error);
    const [rutas] = await pool.query("SELECT * FROM rutas WHERE estado = 'activa'");
    res.render('admin/nuevo-viaje', { rutas, error: 'No se pudo crear el viaje.' });
  }
};

exports.mostrarEditarViaje = async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM viajes WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).send('Viaje no encontrado');
  res.render('admin/editar-viaje', { viaje: rows[0], error: null });
};

exports.actualizarViaje = async (req, res) => {
  const { id } = req.params;
  const { fecha, hora, precio, estado } = req.body;
  try {
    await pool.query(
      'UPDATE viajes SET fecha = ?, hora = ?, precio = ?, estado = ? WHERE id = ?',
      [fecha, hora, precio, estado, id]
    );
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    res.status(500).send('Error al actualizar el viaje');
  }
};

// Detalle de un viaje: asientos ocupados/libres y sus reservas
exports.mostrarViaje = async (req, res) => {
  const { id } = req.params;
  try {
    const [viajeRows] = await pool.query(`
      SELECT v.*, r.origen, r.destino FROM viajes v
      INNER JOIN rutas r ON v.ruta_id = r.id WHERE v.id = ?
    `, [id]);
    if (viajeRows.length === 0) return res.status(404).send('Viaje no encontrado');
    const viaje = viajeRows[0];

    const [reservas] = await pool.query(`
      SELECT res.*, p.metodo AS metodo_pago, p.estado AS estado_pago, p.id AS pago_id
      FROM reservas res
      LEFT JOIN pagos p ON p.id = (SELECT id FROM pagos WHERE reserva_id = res.id ORDER BY id DESC LIMIT 1)
      WHERE res.viaje_id = ?
      ORDER BY res.asiento ASC
    `, [id]);

    const asientosOcupados = reservas.filter(r => r.estado !== 'cancelado').map(r => r.asiento);

    res.render('admin/viaje', { viaje, reservas, asientosOcupados });
  } catch (error) {
    console.error('Error al cargar el viaje:', error);
    res.status(500).send('Error al cargar el viaje');
  }
};

// ---------- PAGOS Y RESERVAS ----------

exports.confirmarPago = async (req, res) => {
  const { id } = req.params; // id del pago
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pagoRows] = await connection.query(`
      SELECT p.*, res.nombre_cliente, res.dni, res.celular, res.asiento,
             res.punto_embarque, res.codigo_reserva, v.fecha, v.hora,
             v.precio, r.origen, r.destino
      FROM pagos p
      INNER JOIN reservas res ON p.reserva_id = res.id
      INNER JOIN viajes v ON res.viaje_id = v.id
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE p.id = ?
    `, [id]);

    if (pagoRows.length === 0) {
      await connection.rollback();
      return res.status(404).send('Pago no encontrado');
    }

    const pago = pagoRows[0];

    await connection.query("UPDATE pagos SET estado = 'confirmado' WHERE id = ?", [id]);
    await connection.query("UPDATE reservas SET estado = 'pagado' WHERE id = ?", [pago.reserva_id]);

    await connection.commit();

    const numeroWhatsapp = formatearCelularWhatsapp(pago.celular);
    const mensajeCliente = crearMensajePagoConfirmado(pago);
    const linkWhatsapp = numeroWhatsapp
      ? `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensajeCliente)}`
      : null;

    return res.render('admin/pago-confirmado', {
      reserva: pago,
      linkWhatsapp,
      mensajeCliente
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al confirmar pago:', error);
    res.status(500).send('Error al confirmar el pago');
  } finally {
    connection.release();
  }
};

exports.cancelarReserva = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("UPDATE reservas SET estado = 'cancelado' WHERE id = ?", [id]);

    res.redirect(req.get('Referrer') || '/admin/dashboard');

  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).send('Error al cancelar la reserva');
  }
};

// ---------- REPORTES ----------

exports.mostrarReportes = async (req, res) => {
  try {
    const [filas] = await pool.query(`
      SELECT v.id, v.fecha, v.hora, r.origen, r.destino, v.precio,
        COUNT(CASE WHEN res.estado = 'pagado' THEN 1 END) AS asientos_pagados,
        COALESCE(SUM(CASE WHEN res.estado = 'pagado' THEN v.precio END), 0) AS ingresos
      FROM viajes v
      INNER JOIN rutas r ON v.ruta_id = r.id
      LEFT JOIN reservas res ON res.viaje_id = v.id
      GROUP BY v.id
      ORDER BY v.fecha DESC
    `);
    res.render('admin/reportes', { filas });
  } catch (error) {
    console.error('Error al cargar reportes:', error);
    res.status(500).send('Error al cargar los reportes');
  }
};