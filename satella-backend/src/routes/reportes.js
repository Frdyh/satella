const { Router } = require('express');
const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit');

const router = Router();

function sendPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
}

router.get('/ventas', async (req, res, next) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { cliente: true, items: { include: { producto: true } } },
      orderBy: { fecha: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    sendPdf(res, doc, 'reporte-ventas.pdf');

    doc.fontSize(20).text('Reporte de Ventas', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-CO')}`);
    doc.moveDown();

    doc.fontSize(12).text('Pedidos');
    doc.moveDown(0.5);

    pedidos.forEach((p) => {
      doc.fontSize(10).text(
        `Pedido #${p.id} — ${p.cliente.nombre} — ${p.estado} — ${p.fecha.toLocaleDateString('es-CO')}`
      );
    });

    doc.end();
  } catch (err) { next(err); }
});

router.get('/inventario', async (_req, res, next) => {
  try {
    const productos = await prisma.producto.findMany({
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    sendPdf(res, doc, 'reporte-inventario.pdf');

    doc.fontSize(20).text('Reporte de Inventario', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-CO')}`);
    doc.moveDown();

    productos.forEach((p) => {
      const stockLabel = p.stockActual <= p.stockMinimo ? ' [STOCK BAJO]' : '';
      doc.fontSize(10).text(
        `${p.nombre} — ${p.categoria.nombre} — Stock: ${p.stockActual}${stockLabel}`
      );
    });

    doc.end();
  } catch (err) { next(err); }
});

router.get('/clientes', async (_req, res, next) => {
  try {
    const clientes = await prisma.cliente.findMany({
      include: { _count: { select: { pedidos: true } } },
      orderBy: { nombre: 'asc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    sendPdf(res, doc, 'reporte-clientes.pdf');

    doc.fontSize(20).text('Reporte de Clientes', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-CO')}`);
    doc.moveDown();

    clientes.forEach((c) => {
      doc.fontSize(10).text(
        `${c.nombre} — ${c.ciudad || 'N/A'} — Pedidos: ${c._count.pedidos}`
      );
    });

    doc.end();
  } catch (err) { next(err); }
});

router.get('/envios', async (_req, res, next) => {
  try {
    const envios = await prisma.envio.findMany({
      include: { pedido: { include: { cliente: true } } },
      orderBy: { fechaProgramada: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    sendPdf(res, doc, 'reporte-envios.pdf');

    doc.fontSize(20).text('Reporte de Envíos', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-CO')}`);
    doc.moveDown();

    envios.forEach((e) => {
      doc.fontSize(10).text(
        `Envío #${e.id} — Pedido #${e.pedidoId} — ${e.pedido.cliente.nombre} — ${e.estado} — ${e.fechaProgramada.toLocaleDateString('es-CO')}`
      );
    });

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
