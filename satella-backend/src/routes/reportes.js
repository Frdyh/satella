const { Router } = require('express');
const controller = require('../controllers/reportesController');

const router = Router();

router.get('/ventas', controller.ventas);
router.get('/inventario', controller.inventario);
router.get('/clientes', controller.clientes);
router.get('/envios', controller.envios);

module.exports = router;
