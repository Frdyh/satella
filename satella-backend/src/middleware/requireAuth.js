const prisma = require('../lib/prisma');
const { verifyToken } = require('../utils/token');
const { PUBLIC_SELECT } = require('../controllers/usuariosController');

/**
 * Exige un token válido en el header "Authorization: Bearer <token>".
 * Si el token es válido, deja el usuario en req.usuario.
 *
 * `allowQueryToken` solo debe activarse en rutas que se abren en otra
 * pestaña sin headers (p.ej. links de PDF) — no usar de forma global,
 * porque expondría el JWT en logs, historial del navegador y proxies.
 */
function buildRequireAuth(allowQueryToken) {
  return async function requireAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const token = header.startsWith('Bearer ')
      ? header.slice(7)
      : (allowQueryToken && req.method === 'GET' ? req.query.token : null);

    if (!token) return res.status(401).json({ error: 'No autenticado' });

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: PUBLIC_SELECT,
      });
      if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' });
      req.usuario = usuario;
      next();
    } catch (err) { next(err); }
  };
}

const requireAuth = buildRequireAuth(false);
requireAuth.withQueryToken = buildRequireAuth(true);

module.exports = requireAuth;
