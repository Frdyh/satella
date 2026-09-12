/**
 * Paginación opcional basada en query params (?page=1&limit=50).
 * Si el cliente no envía page ni limit, devuelve null y el endpoint
 * mantiene su comportamiento actual (sin límite), para no romper
 * a los consumidores existentes que esperan el array completo.
 */
function getPagination(query) {
  if (query.page === undefined && query.limit === undefined) return null;

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 50);
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

module.exports = { getPagination };
