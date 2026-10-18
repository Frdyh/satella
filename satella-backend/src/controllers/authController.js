const prisma = require('../lib/prisma');
const { missingFields } = require('../utils/validate');
const { verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { PUBLIC_SELECT } = require('./usuariosController');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const missing = missingFields({ email, password }, ['email', 'password']);
    if (missing.length) return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });

    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    // Mismo mensaje si el email no existe o la contraseña es incorrecta,
    // para no revelar qué correos están registrados.
    if (!usuario || !verifyPassword(String(password), usuario.passwordHash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const { passwordHash, ...publico } = usuario;
    res.json({ token: signToken(usuario), usuario: publico });
  } catch (err) { next(err); }
}

async function me(req, res) {
  res.json(req.usuario);
}

module.exports = { login, me };
