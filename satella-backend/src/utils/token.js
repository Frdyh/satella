const jwt = require('jsonwebtoken');

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está definido en el archivo .env');
  return secret;
}

/** Firma un token con lo mínimo para identificar al usuario. */
function signToken(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, getSecret(), { expiresIn: EXPIRES_IN });
}

/** Devuelve el payload si el token es válido; lanza error si no. */
function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
