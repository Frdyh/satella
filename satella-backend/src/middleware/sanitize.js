/**
 * Limpia los datos del body antes de pasarlos a Prisma.
 * Convierte strings vacíos a null en campos opcionales,
 * y确保 que los IDs FK sean numéricos.
 */
function sanitize(body, { dateFields = [], intFields = [] } = {}) {
  const cleaned = { ...body };

  for (const key of Object.keys(cleaned)) {
    const val = cleaned[key];

    if (val === '' || val === undefined) {
      cleaned[key] = null;
    }

    if (dateFields.includes(key) && cleaned[key] !== null) {
      cleaned[key] = new Date(cleaned[key]);
    }

    if (intFields.includes(key) && cleaned[key] !== null) {
      cleaned[key] = Number(cleaned[key]);
    }
  }

  return cleaned;
}

module.exports = sanitize;
