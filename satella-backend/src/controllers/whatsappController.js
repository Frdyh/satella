const crypto = require('crypto');
const { parsearWebhook } = require('../services/whatsapp/parser');
const { crearSalida } = require('../services/whatsapp/cloudApi');
const { recibirMensaje } = require('../services/whatsapp/entrada');
const { normalizarTelefono } = require('../utils/phone');
const { limpiarTexto } = require('../utils/sanitize');

/**
 * GET /api/whatsapp/webhook — verificación inicial que hace Meta al configurar
 * el webhook: hay que devolver hub.challenge solo si el verify_token coincide.
 */
function verificar(req, res) {
  const token = process.env.WA_VERIFY_TOKEN;
  const ok = token
    && req.query['hub.mode'] === 'subscribe'
    && req.query['hub.verify_token'] === token;
  if (!ok) {
    console.warn('[WhatsApp] Verificación del webhook rechazada (403): el verify token no coincide con WA_VERIFY_TOKEN');
    return res.status(403).send('Token de verificación inválido');
  }
  console.log('[WhatsApp] Webhook verificado por Meta ✅');
  res.status(200).type('text/plain').send(String(req.query['hub.challenge'] || ''));
}

/**
 * POST /api/whatsapp/webhook — mensajes entrantes (la firma ya se validó en
 * verifyMetaSignature). Se responde 200 de inmediato: si Meta no recibe
 * respuesta rápida reintenta, y la idempotencia descarta esos reintentos.
 */
function recibir(req, res) {
  const mensajes = parsearWebhook(req.body);
  res.sendStatus(200);

  (async () => {
    for (const mensaje of mensajes) {
      try {
        await recibirMensaje(mensaje, crearSalida(mensaje.telefono));
      } catch (err) {
        // Solo el tipo de error: el mensaje completo (sobre todo los de Prisma, que
        // incluyen los datos de la consulta) puede traer PINs o datos personales.
        console.error(`[WhatsApp] Error procesando un mensaje: ${err.code || err.name}`);
      }
    }
  })();
}

/**
 * Arma un payload igual al que envía Meta, para que el simulador recorra
 * exactamente el mismo camino (parser incluido) que un mensaje real.
 */
function payloadSimulado({ telefono, texto, opcionId, opcionTexto, wamid }) {
  const mensaje = { from: telefono, id: wamid, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (opcionId) {
    mensaje.type = 'interactive';
    mensaje.interactive = { type: 'list_reply', list_reply: { id: opcionId, title: opcionTexto || opcionId } };
  } else {
    mensaje.type = 'text';
    mensaje.text = { body: texto };
  }
  return {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages: [mensaje] } }] }],
  };
}

/**
 * POST /api/whatsapp/simulador — solo con ENABLE_WA_SIMULATOR=true.
 * Body: { telefono, texto } o { telefono, opcionId, opcionTexto? }, y wamid opcional
 * (repetirlo sirve para probar la idempotencia).
 * Responde con los mensajes que el bot habría enviado, en lugar de mandarlos a Meta.
 */
async function simular(req, res, next) {
  try {
    const telefono = normalizarTelefono(req.body.telefono);
    if (!telefono) return res.status(400).json({ error: 'Teléfono inválido' });
    const texto = limpiarTexto(req.body.texto, 1000);
    const opcionId = limpiarTexto(req.body.opcionId, 200);
    if (!texto && !opcionId) return res.status(400).json({ error: 'Envía "texto" u "opcionId"' });

    const wamid = limpiarTexto(req.body.wamid, 255) || `sim-${crypto.randomUUID()}`;
    const [mensaje] = parsearWebhook(payloadSimulado({
      telefono, texto, opcionId, opcionTexto: limpiarTexto(req.body.opcionTexto, 100), wamid,
    }));

    const salida = crearSalida(telefono, { modo: 'simulador' });
    const resultado = await recibirMensaje(mensaje, salida);
    res.json({ resultado, wamid, respuestas: salida.enviados });
  } catch (err) { next(err); }
}

module.exports = { verificar, recibir, simular };
