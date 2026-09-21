const { Router } = require('express');
const validateId = require('../middleware/validateId');
const controller = require('../controllers/pedidosController');

const router = Router();

router.param('id', validateId);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
