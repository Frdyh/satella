/**
 * Stock de los pedidos.
 *
 * Regla: un pedido tiene su stock apartado SOLO mientras está "confirmado".
 *   - Al pasar a confirmado se descuenta (si algún producto no alcanza, se
 *     rechaza todo el cambio).
 *   - Al salir de confirmado (cancelado, o de vuelta a pendiente) o al
 *     eliminarlo confirmado, se devuelve.
 * Los pedidos de WhatsApp llegan "pendiente" y no reservan stock: gana quien
 * el personal confirme primero.
 *
 * Se llama siempre dentro de un prisma.$transaction: si algo falla, no queda
 * ningún descuento a medias.
 */
const CONFIRMADO = 'confirmado';

/** { productoId: cantidadTotal } — un mismo producto puede venir en varios items. */
function agrupar(items) {
  const total = new Map();
  for (const i of items) total.set(i.productoId, (total.get(i.productoId) || 0) + i.cantidad);
  return total;
}

async function descontar(tx, items) {
  for (const [productoId, cantidad] of agrupar(items)) {
    // El descuento solo se aplica si todavía hay suficiente, en una sola operación:
    // dos confirmaciones simultáneas no pueden dejar el stock negativo.
    const { count } = await tx.producto.updateMany({
      where: { id: productoId, stockActual: { gte: cantidad } },
      data: { stockActual: { decrement: cantidad } },
    });
    if (!count) {
      const p = await tx.producto.findUnique({ where: { id: productoId }, select: { nombre: true, stockActual: true } });
      const mensaje = p
        ? `Stock insuficiente de ${p.nombre}: hay ${p.stockActual} y el pedido necesita ${cantidad}.`
        : `El producto ${productoId} ya no existe.`;
      throw Object.assign(new Error(`No se puede confirmar el pedido. ${mensaje}`), { status: 409 });
    }
  }
}

async function devolver(tx, items) {
  for (const [productoId, cantidad] of agrupar(items)) {
    // updateMany: si el producto se borró, no falla (no hay a dónde devolverlo).
    await tx.producto.updateMany({ where: { id: productoId }, data: { stockActual: { increment: cantidad } } });
  }
}

/** Aplica el efecto en stock de pasar un pedido del estado `de` al estado `a`. */
async function cambioDeEstado(tx, items, de, a) {
  const antes = de === CONFIRMADO;
  const despues = a === CONFIRMADO;
  if (!antes && despues) await descontar(tx, items);
  if (antes && !despues) await devolver(tx, items);
}

module.exports = { cambioDeEstado, descontar, devolver, CONFIRMADO };
