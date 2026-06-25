const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const pool = require('./config/db');
const webRoutes = require('./routes/webRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Datos globales para las vistas públicas
const whatsappAdmin = process.env.WHATSAPP_ADMIN || '51942554305';
app.locals.brandName = 'Yamira Travel Tours';
app.locals.whatsappAdmin = whatsappAdmin;
app.locals.whatsappUrl = `https://wa.me/${whatsappAdmin}`;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // sesión activa por 4 horas
}));

app.use('/', webRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL exitosa');
    connection.release();
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
  }
});