/**
 * Servicio de verificación por WhatsApp.
 *
 * marcarVerificado: el operador revisa el chat y marca el pedido/envío como
 * verificado desde el panel.
 * enviarConfirmacion: envía un mensaje real por el canal de WhatsApp
 * (ver services/whatsapp/, que implementa el canal completo).
 */
const { crearSalida } = require('./whatsapp/cloudApi');
const { normalizarTelefono } = require('../utils/phone');

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
 * Envía un mensaje de texto al número indicado por WhatsApp Cloud API
 * (services/whatsapp/cloudApi.js). Ojo: WhatsApp solo deja escribir a quien
 * envió un mensaje en las últimas 24 h, y este canal no usa plantillas; quien
 * llame debe revisar antes la ventana (SesionChat.ventanaHasta).
 */
async function enviarConfirmacion(numero, mensaje) {
  const telefono = normalizarTelefono(numero);
  if (!telefono) return { enviado: false, razon: 'Teléfono inválido' };
  return crearSalida(telefono).texto(mensaje);
}

module.exports = { marcarVerificado, enviarConfirmacion };
