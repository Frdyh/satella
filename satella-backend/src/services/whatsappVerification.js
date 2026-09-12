/**
 * Servicio de verificación por WhatsApp.
 *
 * Por ahora es un marcador manual: el operador revisa el chat
 * y marca el pedido/envío como verificado.
 *
 * Diseñado para poder enchufar la API de WhatsApp Business o Twilio
 * más adelante sin tocar el resto del sistema.
 */

async function marcarVerificado(prisma, { tipo, id, notas }) {
  if (tipo === 'pedido') {
    return prisma.pedido.update({
      where: { id },
      data: {
        whatsappVerificado: true,
        whatsappNotas: notas || null,
      },
    });
  }

  if (tipo === 'envio') {
    return prisma.envio.update({
      where: { id },
      data: {
        whatsappVerificado: true,
        notas: notas || null,
      },
    });
  }

  throw Object.assign(new Error('Tipo inválido. Usa "pedido" o "envio".'), { status: 400 });
}

/**
 * Placeholder para futura integración con WhatsApp Business API / Twilio.
 * Cuando se active, aquí iría la lógica de:
 *  1. Enviar mensaje de confirmación al número del cliente
 *  2. Recibir respuesta
 *  3. Actualizar el estado de verificación automáticamente
 */
async function enviarConfirmacion(numero, mensaje) {
  // TODO: integrar con WhatsApp Business API o Twilio
  console.log(`[WhatsApp] Envío pendiente a ${numero}: ${mensaje}`);
  return { enviado: false, razon: 'Integración no implementada aún' };
}

module.exports = { marcarVerificado, enviarConfirmacion };
