const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');
const reservaController = require('../controllers/reservaController');
const pagoController = require('../controllers/pagoController');
const upload = require('../config/upload');

router.get('/', viajeController.mostrarInicio);
router.get('/viajes', viajeController.mostrarViajes);
router.get('/turismo', (req, res) => res.render('turismo'));
router.get('/reservar/:id', reservaController.mostrarFormulario);
router.post('/reservar/:id', reservaController.crearReserva);
router.get('/confirmacion/:codigo', reservaController.mostrarConfirmacion);

router.get('/pago/:codigo', pagoController.mostrarPago);
router.post('/pago/:codigo', upload.single('voucher'), pagoController.registrarPago);
router.get('/pago/:codigo/enviado', pagoController.mostrarPagoEnviado);

module.exports = router;