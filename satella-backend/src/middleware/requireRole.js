const ADMIN_ROLE = 'Administrador';
// Usa el canal de WhatsApp (con PIN) para ver su ruta y reportar entregas.
const REPARTIDOR_ROLE = 'Repartidor';
// Operario: gestiona pedidos y envíos desde el panel y recibe las alertas.
const OPERADOR_ROLE = 'Operador';

/**
 * Deja pasar solo a usuarios cuyo rol esté en `roles`.
 * Debe ir después de requireAuth (necesita req.usuario).
 *   router.post('/', requireRole(ADMIN_ROLE), controller.create);
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
}

module.exports = { requireRole, ADMIN_ROLE, REPARTIDOR_ROLE, OPERADOR_ROLE };
