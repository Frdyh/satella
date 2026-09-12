/**
 * Devuelve un nuevo objeto con solo las claves permitidas de `body`.
 * Evita mass assignment: campos no listados (incluyendo relaciones anidadas
 * de Prisma como `categoria`, `proveedor`, `pedidos`, etc.) se descartan.
 */
function pick(body, fields) {
  const result = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }
  return result;
}

module.exports = pick;
