const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const requireAdmin = require('../middleware/auth');

router.get('/login', adminController.mostrarLogin);
router.post('/login', adminController.procesarLogin);
router.get('/logout', adminController.cerrarSesion);

router.get('/dashboard', requireAdmin, adminController.mostrarDashboard);

router.get('/viajes/nuevo', requireAdmin, adminController.mostrarNuevoViaje);
router.post('/viajes/nuevo', requireAdmin, adminController.crearViaje);
router.get('/viajes/:id', requireAdmin, adminController.mostrarViaje);
router.get('/viajes/:id/editar', requireAdmin, adminController.mostrarEditarViaje);
router.post('/viajes/:id/editar', requireAdmin, adminController.actualizarViaje);

router.post('/pagos/:id/confirmar', requireAdmin, adminController.confirmarPago);
router.post('/reservas/:id/cancelar', requireAdmin, adminController.cancelarReserva);

router.get('/reportes', requireAdmin, adminController.mostrarReportes);

module.exports = router;