/**
 * Puerta de entrada de cada mensaje normalizado, antes de llegar al router:
 *   1. Límite por teléfono (evita que un número sature el sistema).
 *   2. Idempotencia: Meta reintenta entregas; el wamid se registra en
 *      MensajeProcesado ANTES de procesar y, si ya existía, se ignora.
 */
const prisma = require('../../lib/prisma');
const router = require('./router');

const LIMITE_MENSAJES = 20;
const VENTANA_LIMITE_MS = 60 * 1000;
// telefono → { desde, cantidad, avisado }. En memoria: se reinicia con el servidor.
const contadores = new Map();

function superaLimite(telefono, ahora = Date.now()) {
  let c = contadores.get(telefono);
  if (!c || ahora - c.desde > VENTANA_LIMITE_MS) {
    c = { desde: ahora, cantidad: 0, avisado: false };
    contadores.set(telefono, c);
  }
  c.cantidad += 1;
  return c.cantidad > LIMITE_MENSAJES ? c : null;
}

/** true si es la primera vez que vemos este wamid. */
async function registrarMensaje(wamid) {
  try {
    await prisma.mensajeProcesado.create({ data: { wamid } });
    return true;
  } catch (err) {
    if (err.code === 'P2002') return false;
    throw err;
  }
}

/**
 * Procesa un mensaje y devuelve qué pasó: 'procesado' | 'duplicado' | 'limitado'.
 * `salida` es la de cloudApi.crearSalida() para ese teléfono.
 */
async function recibirMensaje(mensaje, salida) {
  const excedido = superaLimite(mensaje.telefono);
  if (excedido) {
    if (!excedido.avisado) {
      excedido.avisado = true;
      await salida.texto('Estás enviando muchos mensajes seguidos. Espera un minuto y vuelve a intentarlo.');
    }
    return 'limitado';
  }
  if (!(await registrarMensaje(mensaje.wamid))) return 'duplicado';
  await router.atender(mensaje, salida);
  return 'procesado';
}

/** Solo para tests. */
function reiniciarLimites() {
  contadores.clear();
}

module.exports = { recibirMensaje, reiniciarLimites, LIMITE_MENSAJES };
