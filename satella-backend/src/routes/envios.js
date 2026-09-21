const { Router } = require('express');
const validateId = require('../middleware/validateId');
const controller = require('../controllers/enviosController');

const router = Router();

router.param('id', validateId);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

/**
 * POST /api/envios/:id/verificar
 * Endpoint especial para marcar un envío como verificado vía WhatsApp.
 */
router.post('/:id/verificar', controller.verificar);

module.exports = router;
