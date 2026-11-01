/**
 * Avisos al personal cuando un repartidor reporta un problema.
 *
 * El reporte SIEMPRE queda en la base (ReporteProblema) y aparece en el panel.
 * Además se avisa por WhatsApp a cada operario con teléfono, pero SOLO si su
 * ventana de 24 h está abierta (escribió al bot en las últimas 24 h): este
 * canal no usa plantillas, y fuera de esa ventana WhatsApp no permite escribir.
 */
const prisma = require('../../lib/prisma');
const sesiones = require('./sesiones');
const { OPERADOR_ROLE } = require('../../middleware/requireRole');

const TIPOS = {
  cliente_ausente: 'Cliente ausente',
  direccion_erronea: 'Dirección errónea',
  producto_danado: 'Producto dañado',
  otro: 'Otro problema',
};

function textoAlerta(reporte, envio, repartidor) {
  const cliente = envio.pedido?.cliente?.nombre;
  return [
    `⚠️ *Problema en el envío #${envio.id}*`,
    `🚚 Reportado por ${repartidor.nombre}`,
    `📋 ${TIPOS[reporte.tipo] || reporte.tipo}${reporte.detalle ? `: "${reporte.detalle}"` : ''}`,
    cliente ? `👤 Cliente: ${cliente}${envio.ventanaHoraria ? ` · ${envio.ventanaHoraria}` : ''}` : null,
    '',
    `Revísalo en el panel de Satella (reporte #${reporte.id}).`,
  ].filter((l) => l !== null).join('\n');
}

/**
 * Avisa a los operarios con ventana abierta. Devuelve cuántos fueron avisados.
 * `salida` es la de la conversación del repartidor: se usa salida.para() para
 * que, en el simulador, los avisos también queden en el simulador.
 */
async function problemaReportado(reporte, { envio, repartidor, salida }) {
  const operarios = await prisma.usuario.findMany({
    where: { rol: OPERADOR_ROLE, telefono: { not: null } },
    select: { telefono: true },
  });
  const texto = textoAlerta(reporte, envio, repartidor);
  let avisados = 0;
  for (const { telefono } of operarios) {
    if (!(await sesiones.ventanaAbierta(telefono))) continue;
    const r = await salida.para(telefono).texto(texto);
    if (r.enviado) avisados += 1;
  }
  return avisados;
}

module.exports = { problemaReportado, textoAlerta, TIPOS };
