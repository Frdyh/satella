const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Devuelve la lista de campos requeridos que faltan o vienen vacíos en `data`.
 */
function missingFields(data, fields) {
  return fields.filter((f) => {
    const v = data[f];
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  });
}

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

/**
 * true si `value` es un número finito (después de sanitize/Number()) y, si se
 * pide, no negativo. Rechaza NaN, undefined, null, strings no numéricos.
 */
function isValidNumber(value, { allowNegative = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return allowNegative || value >= 0;
}

/**
 * true si `value` no viene en el payload, o si viene y está entre los
 * valores permitidos. No exige el campo (eso lo hace missingFields).
 */
function isValidEnum(value, allowed) {
  if (value === undefined || value === null) return true;
  return allowed.includes(value);
}

module.exports = { missingFields, isValidEmail, isValidNumber, isValidEnum };
