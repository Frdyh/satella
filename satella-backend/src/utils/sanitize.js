/**
 * Limpia los datos del body antes de pasarlos a Prisma.
 * Convierte strings vacíos a null en campos opcionales,
 * y asegura que los IDs FK sean numéricos.
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

/**
 * Limpia texto libre que llega de afuera (por ejemplo, mensajes de WhatsApp):
 * quita caracteres de control, colapsa espacios y corta a `max` caracteres.
 * Devuelve '' si no hay texto.
 */
function limpiarTexto(valor, max = 500) {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

module.exports = sanitize;
module.exports.limpiarTexto = limpiarTexto;
