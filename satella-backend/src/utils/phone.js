const INDICATIVO_COLOMBIA = '57';

/**
 * Lleva un teléfono al formato que usa WhatsApp Cloud API: solo dígitos,
 * con indicativo de país y sin "+". Ej.: "311-444-1001" → "573114441001".
 *
 * - Quita espacios, guiones, paréntesis y el "+".
 * - Un celular colombiano de 10 dígitos (empieza por 3) recibe el indicativo 57.
 * - Cualquier otro número debe venir ya con indicativo (8 a 15 dígitos, E.164).
 *
 * Devuelve null si el valor está vacío o no parece un teléfono válido.
 * Es la única regla de formato del proyecto: se usa en todos los puntos de
 * entrada (controllers, seed y el webhook de WhatsApp) para que el mismo
 * número siempre se guarde y se busque igual.
 */
function normalizarTelefono(valor) {
  if (valor === undefined || valor === null) return null;
  const digitos = String(valor).replace(/\D/g, '');
  if (!digitos) return null;
  if (/^3\d{9}$/.test(digitos)) return INDICATIVO_COLOMBIA + digitos;
  if (/^\d{8,15}$/.test(digitos)) return digitos;
  return null;
}

module.exports = { normalizarTelefono };
