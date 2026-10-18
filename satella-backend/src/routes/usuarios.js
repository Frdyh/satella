const { Router } = require('express');
const validateId = require('../middleware/validateId');
const { requireRole, ADMIN_ROLE } = require('../middleware/requireRole');
const controller = require('../controllers/usuariosController');

const router = Router();

router.param('id', validateId);

router.get('/', controller.list);
router.get('/:id', controller.getOne);
// Crear y borrar usuarios es solo para administradores.
router.post('/', requireRole(ADMIN_ROLE), controller.create);
// Editar: el controller decide (admin edita a cualquiera; los demás solo a sí mismos).
router.put('/:id', controller.update);
router.delete('/:id', requireRole(ADMIN_ROLE), controller.remove);

module.exports = router;
