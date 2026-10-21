/**
 * Sender: arma y envía mensajes por WhatsApp Cloud API.
 *
 * Las funciones payload*() solo construyen el JSON que espera Meta (puras,
 * fáciles de probar). crearSalida() decide qué se hace con ellos:
 *   - modo 'cloud':     POST a la Graph API de Meta.
 *   - modo 'simulador': no sale nada a internet; se acumulan en `enviados`
 *                        y el controller los devuelve en la respuesta HTTP.
 * Los flujos solo usan la salida (salida.texto / .botones / .lista), así que
 * funcionan igual con WhatsApp real y con el simulador.
 */
const { limpiarTexto } = require('../../utils/sanitize');

// Límites de la Cloud API para mensajes interactivos.
const LIMITES = {
  cuerpo: 1024,
  botones: 3,
  tituloBoton: 20,
  filas: 10,
  tituloFila: 24,
  descripcionFila: 72,
  textoBotonLista: 20,
  id: 200,
};

function config() {
  return {
    version: process.env.WA_GRAPH_VERSION || 'v26.0',
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    accessToken: process.env.WA_ACCESS_TOKEN,
  };
}

const corta = (texto, max) => limpiarTexto(texto, max);

function payloadTexto(telefono, texto) {
  return {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'text',
    // Los mensajes de texto aceptan hasta 4096 caracteres y saltos de línea.
    text: { body: String(texto).slice(0, 4096) },
  };
}

/** botones: [{ id, titulo }] — máximo 3. */
function payloadBotones(telefono, texto, botones) {
  if (!botones.length || botones.length > LIMITES.botones) {
    throw new Error(`Un mensaje con botones admite de 1 a ${LIMITES.botones} botones`);
  }
  return {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: String(texto).slice(0, LIMITES.cuerpo) },
      action: {
        buttons: botones.map((b) => ({
          type: 'reply',
          reply: { id: String(b.id).slice(0, LIMITES.id), title: corta(b.titulo, LIMITES.tituloBoton) },
        })),
      },
    },
  };
}

/** filas: [{ id, titulo, descripcion? }] — máximo 10. textoBoton abre la lista. */
function payloadLista(telefono, texto, textoBoton, filas) {
  if (!filas.length || filas.length > LIMITES.filas) {
    throw new Error(`Una lista admite de 1 a ${LIMITES.filas} filas`);
  }
  return {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: String(texto).slice(0, LIMITES.cuerpo) },
      action: {
        button: corta(textoBoton, LIMITES.textoBotonLista),
        sections: [{
          rows: filas.map((f) => ({
            id: String(f.id).slice(0, LIMITES.id),
            title: corta(f.titulo, LIMITES.tituloFila),
            ...(f.descripcion ? { description: corta(f.descripcion, LIMITES.descripcionFila) } : {}),
          })),
        }],
      },
    },
  };
}

/** Envía un payload a Meta. Nunca registra el contenido del mensaje. */
async function enviarACloud(payload) {
  const { version, phoneNumberId, accessToken } = config();
  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp] Falta WA_PHONE_NUMBER_ID o WA_ACCESS_TOKEN: no se envió el mensaje');
    return { enviado: false, razon: 'sin configuración' };
  }
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // Solo el código de error: el cuerpo puede incluir el texto o el número.
    const body = await res.json().catch(() => ({}));
    console.error(`[WhatsApp] Meta respondió ${res.status} (código ${body.error?.code ?? '?'})`);
    return { enviado: false, razon: `HTTP ${res.status}` };
  }
  return { enviado: true };
}

/**
 * Crea la "salida" de una conversación hacia `telefono`.
 * modo: 'cloud' (por defecto) o 'simulador'.
 */
function crearSalida(telefono, { modo = 'cloud', enviados = [] } = {}) {
  const enviar = async (payload) => {
    enviados.push(payload);
    if (modo === 'simulador') return { enviado: true };
    try {
      return await enviarACloud(payload);
    } catch (err) {
      console.error(`[WhatsApp] Error de red al enviar: ${err.message}`);
      return { enviado: false, razon: 'error de red' };
    }
  };
  return {
    enviados,
    modo,
    // Salida hacia otro teléfono por el mismo canal (ej. avisar al operario):
    // en el simulador, ese aviso también queda en la respuesta en vez de ir a Meta.
    para: (otroTelefono) => crearSalida(otroTelefono, { modo, enviados }),
    texto: (texto) => enviar(payloadTexto(telefono, texto)),
    botones: (texto, botones) => enviar(payloadBotones(telefono, texto, botones)),
    lista: (texto, textoBoton, filas) => enviar(payloadLista(telefono, texto, textoBoton, filas)),
  };
}

module.exports = { crearSalida, payloadTexto, payloadBotones, payloadLista, LIMITES };
