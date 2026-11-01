const { Router } = require('express');
const validateId = require('../middleware/validateId');
const { requireRole, ADMIN_ROLE, OPERADOR_ROLE } = require('../middleware/requireRole');
const controller = require('../controllers/alertasController');

const router = Router();

router.param('id', validateId);

router.get('/', controller.list);
router.put('/:id/atender', requireRole(ADMIN_ROLE, OPERADOR_ROLE), controller.atender);

module.exports = router;
