const prisma = require('../lib/prisma');
const { verifyToken } = require('../utils/token');
const { PUBLIC_SELECT } = require('../controllers/usuariosController');

/**
 * Exige un token válido en el header "Authorization: Bearer <token>".
 * Los links de PDF se abren en otra pestaña (sin headers), por eso para
 * peticiones GET también se acepta ?token=<token> en la URL.
 * Si el token es válido, deja el usuario en req.usuario.
 */
async function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (req.method === 'GET' ? req.query.token : null);

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
}

module.exports = requireAuth;
