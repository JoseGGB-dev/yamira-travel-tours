const pool = require('../config/db');

// Página de inicio: muestra los próximos 3 viajes
exports.mostrarInicio = async (req, res) => {
  try {
    const [proximosViajes] = await pool.query(`
      SELECT v.id, v.fecha, v.hora, v.precio, v.capacidad, r.origen, r.destino
      FROM viajes v
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE v.estado = 'programado' AND v.fecha >= CURDATE()
      ORDER BY v.fecha ASC, v.hora ASC
      LIMIT 3
    `);

    res.render('index', { proximosViajes });
  } catch (error) {
    console.error('Error al cargar la página de inicio:', error);
    res.status(500).send('Error al cargar la página');
  }
};

// Lista completa de viajes disponibles
exports.mostrarViajes = async (req, res) => {
  try {
    const [viajes] = await pool.query(`
      SELECT v.id, v.fecha, v.hora, v.precio, v.capacidad, r.origen, r.destino
      FROM viajes v
      INNER JOIN rutas r ON v.ruta_id = r.id
      WHERE v.estado = 'programado' AND v.fecha >= CURDATE()
      ORDER BY v.fecha ASC, v.hora ASC
    `);

    res.render('viajes', { viajes });
  } catch (error) {
    console.error('Error al cargar los viajes:', error);
    res.status(500).send('Error al cargar los viajes');
  }
};