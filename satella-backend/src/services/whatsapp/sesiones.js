/**
 * Lectura y escritura de SesionChat: en qué flujo y paso va cada teléfono.
 *
 * Además del flujo, la sesión guarda datos de seguridad que NO se borran al
 * reiniciar la conversación ("menu", "cancelar" o inactividad): la
 * verificación del PIN y el bloqueo por intentos fallidos. Así nadie puede
 * saltarse un bloqueo escribiendo "cancelar".
 */
const prisma = require('../../lib/prisma');

const INACTIVIDAD_MS = 30 * 60 * 1000;
// WhatsApp solo permite responder dentro de las 24 h siguientes al último
// mensaje del usuario (este canal no usa plantillas).
const VENTANA_MS = 24 * 60 * 60 * 1000;

function cargar(telefono) {
  return prisma.sesionChat.findUnique({ where: { telefono } });
}

/** true si la conversación lleva más de 30 minutos sin actividad. */
function inactiva(sesion, ahora = new Date()) {
  return ahora - new Date(sesion.actualizadaEn) > INACTIVIDAD_MS;
}

/**
 * Guarda el paso actual. Se llama con cada mensaje entrante, así que también
 * renueva la ventana de 24 h para poder escribirle a este teléfono.
 */
function guardar(telefono, { flujo, paso, contexto }) {
  const data = {
    flujo,
    paso,
    contexto: contexto || {},
    ventanaHasta: new Date(Date.now() + VENTANA_MS),
  };
  return prisma.sesionChat.upsert({
    where: { telefono },
    create: { telefono, ...data },
    update: data,
  });
}

/** true si a este teléfono todavía se le puede escribir (ventana de 24 h abierta). */
async function ventanaAbierta(telefono, ahora = new Date()) {
  const sesion = await cargar(telefono);
  return Boolean(sesion?.ventanaHasta && new Date(sesion.ventanaHasta) > ahora);
}

module.exports = { cargar, guardar, inactiva, ventanaAbierta, INACTIVIDAD_MS, VENTANA_MS };
