require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function crearAdmin() {
  const usuario = process.argv[2];
  const password = process.argv[3];

  if (!usuario || !password) {
    console.log('Uso: node scripts/crearAdmin.js <usuario> <contraseña>');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admin (usuario, password) VALUES (?, ?)', [usuario, hash]);
    console.log('Administrador creado correctamente:', usuario);
  } catch (error) {
    console.error('Error al crear administrador:', error.message);
  } finally {
    process.exit();
  }
}

crearAdmin();