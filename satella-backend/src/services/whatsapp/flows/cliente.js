/**
 * Flujo del cliente antiguo (su teléfono está en Cliente).
 *
 * Menú: Hacer pedido / Mis pedidos / Cambiar dirección.
 *
 * Hacer pedido: producto (lista) → cantidad (lista) → ¿agregar más? →
 * dirección de entrega → resumen → crea el Pedido en estado "pendiente".
 * NO descuenta stock: eso pasa cuando el personal lo confirma en el panel.
 *
 * El carrito vive en SesionChat.contexto hasta confirmar. Los productos se
 * vuelven a leer de la base de datos al elegirlos y al confirmar: nunca se
 * confía en precios, stock o ids guardados en el chat.
 */
const prisma = require('../../../lib/prisma');

const POR_PAGINA = 9;             // 9 productos + "Ver más" = 10 filas (máximo de una lista)
const MAX_PRODUCTOS_CARRITO = 10;
const MAX_CANTIDAD = 99;
const MAX_DIRECCION = 255;

const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
/**
 * "2 kg", "3 litros", "1 unidad": la cantidad con la unidad de venta del producto.
 * Las abreviaturas (kg, g, ml) no cambian en plural.
 */
function cantidadCon(n, unidad = 'unidad') {
  if (n === 1 || /^[a-z]{1,3}$/i.test(unidad)) return `${n} ${unidad}`;
  return `${n} ${unidad}${/[aeiou]$/i.test(unidad) ? 's' : 'es'}`;
}
const ESTADO_PEDIDO = { pendiente: '⏳ Pendiente', confirmado: '✅ Confirmado', cancelado: '❌ Cancelado' };
const ESTADO_ENVIO = { 'en cola': 'en preparación', 'en ruta': 'en camino 🚚', entregado: 'entregado', retraso: 'con retraso' };

function productosConStock() {
  return prisma.producto.findMany({
    where: { stockActual: { gt: 0 } },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, unidad: true, precio: true, stockActual: true },
  });
}

function totalCarrito(carrito) {
  return carrito.reduce((t, i) => t + i.precio * i.cantidad, 0);
}

function lineasCarrito(carrito) {
  return carrito.map((i) => `• ${i.cantidad} × ${i.nombre} — ${pesos(i.precio * i.cantidad)}`).join('\n');
}

/** Suma la cantidad al carrito (si el producto ya estaba, se acumula). */
function agregarAlCarrito(contexto, cantidad) {
  const p = contexto.productoActual;
  const existente = contexto.carrito.find((i) => i.productoId === p.id);
  const total = cantidad + (existente?.cantidad || 0);
  if (total > p.stock) {
    return {
      error: existente
        ? `Solo hay ${cantidadCon(p.stock, p.unidad)} de ${p.nombre} y ya tienes ${existente.cantidad} en tu pedido.`
        : `Solo hay ${cantidadCon(p.stock, p.unidad)} de ${p.nombre}.`,
    };
  }
  if (existente) existente.cantidad = total;
  else contexto.carrito.push({ productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad });
  delete contexto.productoActual;
  return { decir: [`Agregado: ${cantidadCon(cantidad, p.unidad)} de ${p.nombre} ✅`], ir: 'masProductos' };
}

function validarDireccion(texto) {
  const valor = String(texto || '').trim();
  if (valor.length < 5) return { error: 'Esa dirección es muy corta. Escríbela completa (ej. Calle 12 #5-30).' };
  if (valor.length > MAX_DIRECCION) return { error: `Esa dirección es muy larga (máximo ${MAX_DIRECCION} caracteres).` };
  return { valor };
}

async function crearPedido(cliente, contexto) {
  // Se vuelven a leer los productos: pudieron borrarse mientras se armaba el pedido.
  const ids = contexto.carrito.map((i) => i.productoId);
  const existentes = await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const vigentes = new Set(existentes.map((p) => p.id));
  const items = contexto.carrito.filter((i) => vigentes.has(i.productoId));
  if (!items.length) return null;

  const notas = ['Pedido hecho por WhatsApp'];
  if (contexto.direccionEntrega) notas.push(`Entregar en: ${contexto.direccionEntrega}`);

  return prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      estado: 'pendiente',
      // El pedido llegó desde el WhatsApp del propio cliente (su número está registrado).
      whatsappVerificado: true,
      whatsappNotas: notas.join(' · ').slice(0, 255),
      items: { create: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })) },
    },
  });
}

async function misPedidos(cliente) {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: cliente.id },
    orderBy: { fecha: 'desc' },
    take: 5,
    include: { items: { include: { producto: { select: { nombre: true, precio: true } } } }, envio: { select: { estado: true } } },
  });
  if (!pedidos.length) return 'Todavía no tienes pedidos. Escribe *menu* y elige *Hacer pedido* para hacer el primero.';
  const bloques = pedidos.map((p) => {
    const total = p.items.reduce((t, i) => t + i.cantidad * i.producto.precio, 0);
    const fecha = new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    const envio = p.envio ? ` · Envío ${ESTADO_ENVIO[p.envio.estado] || p.envio.estado}` : '';
    const productos = p.items.map((i) => `${i.cantidad} × ${i.producto.nombre}`).join(', ');
    return `*Pedido #${p.id}* (${fecha}) — ${ESTADO_PEDIDO[p.estado] || p.estado}${envio}\n${productos} · ${pesos(total)}`;
  });
  return `Tus últimos pedidos:\n\n${bloques.join('\n\n')}\n\nEscribe *menu* para volver al menú.`;
}

module.exports = {
  cantidadCon,
  nombre: 'cliente',
  inicio: 'menu',
  pasos: {
    menu: {
      mostrar: ({ perfil }) => ({
        texto: `Hola ${perfil.cliente.nombre.split(' ')[0]} 👋 ¿Qué quieres hacer hoy?`,
        boton: 'Ver opciones',
        filas: [
          { id: 'menu:pedido', titulo: 'Hacer pedido', descripcion: 'Elige productos del catálogo' },
          { id: 'menu:mis-pedidos', titulo: 'Mis pedidos', descripcion: 'Estado de tus últimos pedidos' },
          { id: 'menu:direccion', titulo: 'Cambiar dirección', descripcion: 'Actualiza tu dirección de entrega' },
        ],
      }),
      recibir: async ({ opcion }, { perfil, contexto }) => {
        if (opcion.id === 'menu:pedido') {
          contexto.carrito = [];
          contexto.pagina = 0;
          return { ir: 'producto' };
        }
        if (opcion.id === 'menu:mis-pedidos') return { decir: [await misPedidos(perfil.cliente)], fin: true };
        return { ir: 'nuevaDireccion' };
      },
    },

    // ─── Hacer pedido ───────────────────────────────────────────

    producto: {
      mostrar: async ({ contexto }) => {
        const productos = await productosConStock();
        if (!productos.length) {
          return { texto: 'Por ahora no tenemos productos disponibles 😔 Intenta más tarde.', fin: true };
        }
        let inicio = (contexto.pagina || 0) * POR_PAGINA;
        if (inicio >= productos.length) { contexto.pagina = 0; inicio = 0; }
        const restantes = productos.length - inicio;
        const pagina = productos.slice(inicio, inicio + (restantes > 10 ? POR_PAGINA : 10));
        const filas = pagina.map((p) => ({ id: `prod:${p.id}`, titulo: p.nombre, descripcion: `${pesos(p.precio)} · ${p.unidad}` }));
        if (restantes > 10) filas.push({ id: 'prod:mas', titulo: 'Ver más productos ➡️' });
        const llevas = contexto.carrito.length ? `Llevas ${contexto.carrito.length} producto(s) en tu pedido. ` : '';
        return { texto: `${llevas}¿Qué producto quieres? 🧀🥛`, boton: 'Ver productos', filas };
      },
      recibir: async ({ opcion }, { contexto }) => {
        if (opcion.id === 'prod:mas') {
          contexto.pagina = (contexto.pagina || 0) + 1;
          return { ir: 'producto' };
        }
        const producto = await prisma.producto.findUnique({ where: { id: Number(opcion.id.split(':')[1]) } });
        if (!producto || producto.stockActual <= 0) return { error: 'Ese producto ya no está disponible. Elige otro.' };
        contexto.productoActual = {
          id: producto.id, nombre: producto.nombre, precio: producto.precio, unidad: producto.unidad, stock: producto.stockActual,
        };
        return { ir: 'cantidad' };
      },
    },

    cantidad: {
      mostrar: ({ contexto }) => {
        const p = contexto.productoActual;
        const filas = [1, 2, 3].filter((n) => n <= p.stock).map((n) => ({ id: `cant:${n}`, titulo: cantidadCon(n, p.unidad) }));
        if (p.stock > 3) filas.push({ id: 'cant:otra', titulo: 'Otra cantidad' });
        return { texto: `¿Cuánto quieres de *${p.nombre}*? (${pesos(p.precio)} por ${p.unidad})`, boton: 'Elegir cantidad', filas };
      },
      recibir: ({ opcion }, { contexto }) => {
        if (opcion.id === 'cant:otra') return { ir: 'cantidadOtra' };
        return agregarAlCarrito(contexto, Number(opcion.id.split(':')[1]));
      },
    },

    cantidadOtra: {
      mostrar: ({ contexto }) => ({
        texto: `Escribe cuánto quieres de *${contexto.productoActual.nombre}*, en ${contexto.productoActual.unidad} (máximo ${Math.min(contexto.productoActual.stock, MAX_CANTIDAD)}).`,
      }),
      recibir: ({ texto }, { contexto }) => {
        const n = Number(String(texto).trim());
        const max = Math.min(contexto.productoActual.stock, MAX_CANTIDAD);
        if (!Number.isInteger(n) || n < 1) return { error: 'Escribe solo un número entero, por ejemplo: 5' };
        if (n > max) return { error: `El máximo que puedes pedir de este producto es ${max}.` };
        return agregarAlCarrito(contexto, n);
      },
    },

    masProductos: {
      mostrar: ({ contexto }) => {
        const botones = [];
        if (contexto.carrito.length < MAX_PRODUCTOS_CARRITO) botones.push({ id: 'mas:otro', titulo: 'Agregar otro' });
        botones.push({ id: 'mas:terminar', titulo: 'Terminar pedido' }, { id: 'mas:cancelar', titulo: 'Cancelar pedido' });
        return {
          texto: `Tu pedido hasta ahora:\n${lineasCarrito(contexto.carrito)}\n*Total: ${pesos(totalCarrito(contexto.carrito))}*\n\n¿Quieres agregar algo más?`,
          botones,
        };
      },
      recibir: ({ opcion }, { contexto }) => {
        if (opcion.id === 'mas:otro') { contexto.pagina = 0; return { ir: 'producto' }; }
        if (opcion.id === 'mas:cancelar') return { decir: ['Listo, cancelé el pedido. No se guardó nada.'], fin: true };
        return { ir: 'direccion' };
      },
    },

    direccion: {
      // Si el cliente no tiene dirección registrada, se le pide escrita (sin botones).
      mostrar: ({ perfil }) => {
        const c = perfil.cliente;
        if (!c.direccion) return { texto: '¿A qué *dirección* te lo llevamos?' };
        return {
          texto: `¿Te lo llevamos a tu dirección registrada?\n📍 ${c.direccion}${c.ciudad ? `, ${c.ciudad}` : ''}`,
          botones: [{ id: 'dir:misma', titulo: 'Sí, a esa' }, { id: 'dir:otra', titulo: 'Otra dirección' }],
        };
      },
      recibir: ({ opcion, texto }, { contexto }) => {
        if (opcion?.id === 'dir:misma') { contexto.direccionEntrega = null; return { ir: 'resumen' }; }
        if (opcion?.id === 'dir:otra') return { ir: 'direccionOtra' };
        const r = validarDireccion(texto);
        if (r.error) return r;
        contexto.direccionEntrega = r.valor;
        return { ir: 'resumen' };
      },
    },

    direccionOtra: {
      mostrar: () => ({ texto: 'Escribe la dirección para *este pedido* (tu dirección registrada no cambia):' }),
      recibir: ({ texto }, { contexto }) => {
        const r = validarDireccion(texto);
        if (r.error) return r;
        contexto.direccionEntrega = r.valor;
        return { ir: 'resumen' };
      },
    },

    resumen: {
      mostrar: ({ perfil, contexto }) => {
        const c = perfil.cliente;
        const entrega = contexto.direccionEntrega || `${c.direccion}${c.ciudad ? `, ${c.ciudad}` : ''}`;
        return {
          texto: [
            '🧾 *Resumen de tu pedido*', '',
            lineasCarrito(contexto.carrito),
            `*Total: ${pesos(totalCarrito(contexto.carrito))}*`, '',
            `📍 Entrega: ${entrega}`, '',
            'Al confirmar, nuestro equipo lo revisará y te lo despachará.',
          ].join('\n'),
          botones: [{ id: 'res:confirmar', titulo: 'Confirmar pedido' }, { id: 'res:cancelar', titulo: 'Cancelar' }],
        };
      },
      recibir: async ({ opcion }, { perfil, contexto }) => {
        if (opcion.id === 'res:cancelar') return { decir: ['Listo, cancelé el pedido. No se guardó nada.'], fin: true };
        const pedido = await crearPedido(perfil.cliente, contexto);
        if (!pedido) return { decir: ['Los productos de tu pedido ya no están disponibles 😔 Escribe *menu* para empezar de nuevo.'], fin: true };
        return {
          decir: [`¡Recibimos tu pedido #${pedido.id}! ✅\nEstá *pendiente* de confirmación por nuestro equipo. Puedes ver cómo va en *Mis pedidos*.`],
          fin: true,
        };
      },
    },

    // ─── Cambiar dirección ──────────────────────────────────────

    nuevaDireccion: {
      mostrar: ({ perfil }) => ({
        texto: `Tu dirección actual es:\n📍 ${perfil.cliente.direccion || '(sin dirección)'}\n\nEscribe la *nueva dirección*:`,
      }),
      recibir: ({ texto }, { contexto }) => {
        const r = validarDireccion(texto);
        if (r.error) return r;
        contexto.nuevaDireccion = r.valor;
        return { ir: 'confirmarDireccion' };
      },
    },

    // Acción sensible: se pide confirmación explícita antes de guardar.
    confirmarDireccion: {
      mostrar: ({ contexto }) => ({
        texto: `¿Confirmas que tu nueva dirección es:\n📍 ${contexto.nuevaDireccion}?`,
        botones: [{ id: 'cdir:si', titulo: 'Sí, cambiarla' }, { id: 'cdir:no', titulo: 'No, dejarla igual' }],
      }),
      recibir: async ({ opcion }, { perfil, contexto }) => {
        if (opcion.id === 'cdir:no') return { decir: ['Listo, tu dirección sigue igual.'], fin: true };
        await prisma.cliente.update({ where: { id: perfil.cliente.id }, data: { direccion: contexto.nuevaDireccion } });
        return { decir: ['¡Dirección actualizada! 📍 Tus próximos pedidos llegarán allí.'], fin: true };
      },
    },
  },
};
