/**
 * Adaptador de entrada: convierte el payload del webhook de Meta en una lista
 * de mensajes con el formato interno que usa el resto del canal:
 *
 *   { telefono, tipo, texto, opcionId, wamid }
 *
 * - tipo 'texto':  el usuario escribió (texto = lo que escribió).
 * - tipo 'opcion': tocó un botón o eligió una fila de una lista (opcionId = id
 *   que le pusimos a esa opción; texto = el título visible).
 * - tipo 'otro':   audio, imagen, ubicación, etc. Los flujos responden con un
 *   recordatorio de qué se espera.
 *
 * Los avisos de estado (enviado/entregado/leído) no son mensajes y se ignoran.
 * Formato según la documentación de WhatsApp Cloud API (Graph API v26.0).
 */
const { normalizarTelefono } = require('../../utils/phone');
const { limpiarTexto } = require('../../utils/sanitize');

const MAX_TEXTO = 1000;
const MAX_ID = 200;

function normalizarMensaje(m) {
  const telefono = normalizarTelefono(m.from);
  if (!telefono || !m.id) return null;
  const base = { telefono, wamid: String(m.id).slice(0, 255), texto: '', opcionId: null };

  if (m.type === 'text') {
    return { ...base, tipo: 'texto', texto: limpiarTexto(m.text?.body, MAX_TEXTO) };
  }
  if (m.type === 'interactive') {
    const reply = m.interactive?.button_reply || m.interactive?.list_reply;
    if (reply?.id) {
      return { ...base, tipo: 'opcion', opcionId: limpiarTexto(reply.id, MAX_ID), texto: limpiarTexto(reply.title, 100) };
    }
  }
  // Botón de respuesta rápida de una plantilla: no usamos plantillas, pero por si acaso.
  if (m.type === 'button' && m.button?.payload) {
    return { ...base, tipo: 'opcion', opcionId: limpiarTexto(m.button.payload, MAX_ID), texto: limpiarTexto(m.button.text, 100) };
  }
  return { ...base, tipo: 'otro' };
}

function parsearWebhook(payload) {
  if (!payload || payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return [];
  const mensajes = [];
  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      for (const m of change.value?.messages || []) {
        const normalizado = normalizarMensaje(m);
        if (normalizado) mensajes.push(normalizado);
      }
    }
  }
  return mensajes;
}

module.exports = { parsearWebhook, normalizarMensaje, MAX_TEXTO };
