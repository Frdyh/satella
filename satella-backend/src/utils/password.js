const crypto = require('crypto');

const KEY_LENGTH = 64;

/**
 * Genera un hash con scrypt (incluido en Node, sin dependencias nativas).
 * Formato guardado: "salt:hash", ambos en hex.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compara una contraseña en texto plano contra un hash "salt:hash".
 * Usa timingSafeEqual para no filtrar información por tiempo de respuesta.
 */
function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
