/**
 * Utilidades para probar la API sin MySQL: reemplaza src/lib/prisma.js por
 * una "base de datos" en memoria (tablas Usuario y Cliente, que es lo que usan
 * login, requireAuth, /api/usuarios y la validación de teléfonos) y levanta
 * la app en un puerto libre.
 */
const path = require('path');

process.env.JWT_SECRET = 'secreto-de-prueba';

const { hashPassword } = require('../src/utils/password');

const usuarios = [];
const clientes = [];
const mensajesProcesados = [];
const sesionesChat = [];
const consentimientos = [];
const productos = [];
const pedidos = [];
const pines = [];
const envios = [];
const reportes = [];

// Envío con su pedido y cliente, como el include de los flujos.
const conPedido = (e) => {
  const pedido = pedidos.find((p) => p.id === e.pedidoId) || null;
  return { ...e, pedido: pedido && { ...pedido, cliente: clientes.find((c) => c.id === pedido.clienteId) || null } };
};

// findUnique por cualquier campo único (id, email, telefono…).
const findBy = (rows, where) => rows.find((x) => Object.entries(where).every(([k, v]) => x[k] === v));

// Filtro estilo Prisma para lo que usan los flujos: igualdad, null, gt, gte/lt e in.
function cumple(row, where = {}) {
  return Object.entries(where).every(([k, cond]) => {
    const v = row[k];
    if (cond === null || typeof cond !== 'object' || cond instanceof Date) return v === cond || (cond === null && v == null);
    if ('not' in cond && v === cond.not) return false;
    if ('not' in cond && cond.not === null && v == null) return false;
    if ('in' in cond && !cond.in.includes(v)) return false;
    if ('gt' in cond && !(v > cond.gt)) return false;
    if ('gte' in cond && !(v >= cond.gte)) return false;
    if ('lt' in cond && !(v < cond.lt)) return false;
    return true;
  });
}

function pickSelect(u, select) {
  if (!u || !select) return u;
  return Object.fromEntries(Object.keys(select).map((k) => [k, u[k]]));
}

function notFound() {
  return Object.assign(new Error('Registro no encontrado'), { code: 'P2025' });
}

const fakePrisma = {
  usuario: {
    findUnique: async ({ where, select }) => {
      const u = findBy(usuarios, where);
      return u ? pickSelect(u, select) : null;
    },
    findMany: async ({ where = {}, select } = {}) => {
      const { OR, ...resto } = where;
      return usuarios.filter((u) => cumple(u, resto)).map((u) => pickSelect(u, select));
    },
    count: async () => usuarios.length,
    create: async ({ data, select }) => {
      if (usuarios.some((x) => x.email === data.email)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      const u = { id: Math.max(0, ...usuarios.map((x) => x.id)) + 1, rol: null, telefono: null, ...data };
      usuarios.push(u);
      return pickSelect(u, select);
    },
    update: async ({ where, data, select }) => {
      const u = usuarios.find((x) => x.id === where.id);
      if (!u) throw notFound();
      Object.assign(u, data);
      return pickSelect(u, select);
    },
    delete: async ({ where }) => {
      const i = usuarios.findIndex((x) => x.id === where.id);
      if (i === -1) throw notFound();
      return usuarios.splice(i, 1)[0];
    },
  },
  cliente: {
    findUnique: async ({ where, select }) => {
      const c = findBy(clientes, where);
      return c ? pickSelect(c, select) : null;
    },
    create: async ({ data }) => {
      if (data.telefono && clientes.some((c) => c.telefono === data.telefono)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      const c = { id: Math.max(0, ...clientes.map((x) => x.id)) + 1, ...data };
      clientes.push(c);
      return { ...c };
    },
    update: async ({ where, data }) => {
      const c = findBy(clientes, where);
      if (!c) throw Object.assign(new Error('no existe'), { code: 'P2025' });
      Object.assign(c, data);
      return { ...c };
    },
  },
  producto: {
    findMany: async ({ where = {}, orderBy } = {}) => {
      let rows = productos.filter((p) => (where.stockActual?.gt === undefined || p.stockActual > where.stockActual.gt)
        && (!where.id?.in || where.id.in.includes(p.id)));
      if (orderBy?.nombre) rows = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre));
      return rows.map((p) => ({ ...p }));
    },
    findUnique: async ({ where }) => { const p = findBy(productos, where); return p ? { ...p } : null; },
    updateMany: async ({ where, data }) => {
      const rows = productos.filter((p) => cumple(p, where));
      for (const p of rows) {
        const op = data.stockActual;
        if (op?.decrement !== undefined) p.stockActual -= op.decrement;
        else if (op?.increment !== undefined) p.stockActual += op.increment;
      }
      return { count: rows.length };
    },
  },
  pedido: {
    create: async ({ data }) => {
      const { items, ...resto } = data;
      const p = { id: Math.max(0, ...pedidos.map((x) => x.id)) + 1, fecha: new Date(), estado: 'pendiente', ...resto, items: (items?.create || []).map((i) => ({ ...i })) };
      pedidos.push(p);
      return { ...p };
    },
    findUnique: async ({ where }) => { const p = findBy(pedidos, where); return p ? { ...p, items: p.items.map((i) => ({ ...i })) } : null; },
    updateMany: async ({ where, data }) => { const rows = pedidos.filter((p) => cumple(p, where)); rows.forEach((p) => Object.assign(p, data)); return { count: rows.length }; },
    update: async ({ where, data }) => { const p = findBy(pedidos, where); Object.assign(p, data); return { ...p }; },
    delete: async ({ where }) => { const i = pedidos.findIndex((p) => p.id === where.id); return pedidos.splice(i, 1)[0]; },
    findMany: async ({ where, take }) => pedidos
      .filter((p) => p.clienteId === where.clienteId)
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, take)
      .map((p) => ({ ...p, envio: p.envio || null, items: p.items.map((i) => ({ ...i, producto: productos.find((x) => x.id === i.productoId) })) })),
  },
  pinTemporal: {
    create: async ({ data }) => { const p = { id: pines.length + 1, usadoEn: null, creadoEn: new Date(), ...data }; pines.push(p); return { ...p }; },
    findMany: async ({ where }) => pines.filter((p) => cumple(p, where)).sort((a, b) => b.creadoEn - a.creadoEn).map((p) => ({ ...p })),
    updateMany: async ({ where, data }) => { const rows = pines.filter((p) => cumple(p, where)); rows.forEach((p) => Object.assign(p, data)); return { count: rows.length }; },
  },
  envio: {
    findMany: async ({ where, orderBy }) => {
      let rows = envios.filter((e) => cumple(e, where));
      if (orderBy?.ventanaHoraria) rows = [...rows].sort((a, b) => a.ventanaHoraria.localeCompare(b.ventanaHoraria));
      return rows.map(conPedido);
    },
    findFirst: async ({ where }) => { const e = envios.find((x) => cumple(x, where)); return e ? conPedido(e) : null; },
    update: async ({ where, data }) => { const e = findBy(envios, where); Object.assign(e, data); return { ...e }; },
    updateMany: async ({ where, data }) => { const rows = envios.filter((e) => cumple(e, where)); rows.forEach((e) => Object.assign(e, data)); return { count: rows.length }; },
  },
  reporteProblema: {
    create: async ({ data }) => { const r = { id: reportes.length + 1, estado: 'abierto', creadoEn: new Date(), atendidoPorId: null, ...data }; reportes.push(r); return { ...r }; },
    findMany: async ({ where }) => reportes.filter((r) => cumple(r, where)).sort((a, b) => b.creadoEn - a.creadoEn)
      .map((r) => ({ ...r, envio: conPedido(envios.find((e) => e.id === r.envioId) || {}), usuario: usuarios.find((u) => u.id === r.usuarioId), atendidoPor: usuarios.find((u) => u.id === r.atendidoPorId) || null })),
    count: async ({ where }) => reportes.filter((r) => cumple(r, where)).length,
    findUnique: async ({ where }) => { const r = findBy(reportes, where); return r ? { ...r, atendidoPor: usuarios.find((u) => u.id === r.atendidoPorId) || null } : null; },
    updateMany: async ({ where, data }) => { const rows = reportes.filter((r) => cumple(r, where)); rows.forEach((r) => Object.assign(r, data)); return { count: rows.length }; },
  },
  consentimientoDatos: {
    create: async ({ data }) => {
      const c = { id: consentimientos.length + 1, ...data };
      consentimientos.push(c);
      return c;
    },
  },
  // Como en MySQL: si la transacción falla, se deshacen sus cambios.
  $transaction: async (fn) => {
    const tablas = [productos, pedidos, clientes, consentimientos, envios, reportes];
    const copia = tablas.map((t) => JSON.parse(JSON.stringify(t)));
    try {
      return await fn(fakePrisma);
    } catch (err) {
      tablas.forEach((t, i) => {
        // JSON pierde las fechas: se restauran como Date.
        t.splice(0, t.length, ...copia[i].map((r) => ({ ...r, ...(r.fecha ? { fecha: new Date(r.fecha) } : {}), ...(r.creadoEn ? { creadoEn: new Date(r.creadoEn) } : {}) })));
      });
      throw err;
    }
  },
  sesionChat: {
    findUnique: async ({ where }) => { const s = findBy(sesionesChat, where); return s ? JSON.parse(JSON.stringify(s)) : null; },
    upsert: async ({ where, create, update }) => {
      let s = findBy(sesionesChat, where);
      if (s) Object.assign(s, update, { actualizadaEn: new Date() });
      else sesionesChat.push((s = { id: sesionesChat.length + 1, intentosFallidos: 0, ...create, actualizadaEn: new Date() }));
      // Copia, como Prisma: el llamador no comparte el objeto guardado.
      return JSON.parse(JSON.stringify(s));
    },
    update: async ({ where, data }) => {
      const s = findBy(sesionesChat, where);
      if (!s) throw Object.assign(new Error('no existe'), { code: 'P2025' });
      Object.assign(s, data);
      return JSON.parse(JSON.stringify(s));
    },
    deleteMany: async ({ where }) => {
      const antes = sesionesChat.length;
      for (let i = sesionesChat.length - 1; i >= 0; i--) if (sesionesChat[i].telefono === where.telefono) sesionesChat.splice(i, 1);
      return { count: antes - sesionesChat.length };
    },
  },
  mensajeProcesado: {
    create: async ({ data }) => {
      if (mensajesProcesados.some((m) => m.wamid === data.wamid)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      mensajesProcesados.push({ ...data, procesadoEn: new Date() });
      return data;
    },
  },
};

const prismaPath = path.join(__dirname, '../src/lib/prisma.js');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const PASSWORD = 'satella123';

/** Vuelve a dejar los usuarios del seed (admin 1, operador 2, despachador 3, repartidor 4) y un cliente. */
function resetUsuarios() {
  usuarios.length = 0;
  usuarios.push(
    { id: 1, nombre: 'Juan Valencia', rol: 'Administrador', email: 'juan@satella.local', passwordHash: hashPassword(PASSWORD) },
    { id: 2, nombre: 'María Fernanda López', rol: 'Operador', email: 'maria@satella.local', passwordHash: hashPassword(PASSWORD), telefono: '573004445566' },
    { id: 3, nombre: 'Carlos Pérez', rol: 'Despachador', email: 'carlos@satella.local', passwordHash: hashPassword(PASSWORD) },
    { id: 4, nombre: 'Diego Ramírez', rol: 'Repartidor', email: 'diego@satella.local', passwordHash: hashPassword(PASSWORD), telefono: '573001112233' },
  );
  clientes.length = 0;
  clientes.push({ id: 1, nombre: 'Laura Gómez', telefono: '573114441001', direccion: 'Calle 12 #5-30', ciudad: 'Fusagasugá' });
  mensajesProcesados.length = 0;
  sesionesChat.length = 0;
  consentimientos.length = 0;
  productos.length = 0;
  productos.push(
    { id: 1, nombre: 'Leche entera 1L', unidad: 'litro', precio: 4500, stockActual: 50 },
    { id: 2, nombre: 'Queso campesino', unidad: 'libra', precio: 12000, stockActual: 2 },
    { id: 3, nombre: 'Arequipe 250g', unidad: 'unidad', precio: 6500, stockActual: 0 },
  );
  pedidos.length = 0;
  pines.length = 0;
  envios.length = 0;
  reportes.length = 0;
}

/** Arranca la app en un puerto aleatorio y devuelve { baseUrl, close }. */
async function startServer() {
  // Silencia el logger de peticiones para que la salida de los tests sea legible.
  const originalLog = console.log;
  console.log = () => {};
  const app = require('../src/app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/api`,
    close: () => new Promise((resolve) => server.close(() => { console.log = originalLog; resolve(); })),
  };
}

/** fetch + JSON: devuelve { status, body }. `raw` manda el cuerpo tal cual (string). */
async function call(baseUrl, method, path, { token, body, raw, headers = {} } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw !== undefined ? raw : (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let parsed = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* texto plano */ }
  return { status: res.status, body: parsed };
}

/**
 * Conversación por el simulador: escribir(telefono, 'texto' | { opcionId, opcionTexto })
 * devuelve los mensajes que respondió el bot. Requiere ENABLE_WA_SIMULATOR=true.
 */
function crearChat(server) {
  const { signToken } = require('../src/utils/token');
  return async function escribir(telefono, contenido) {
    const body = typeof contenido === 'string' ? { telefono, texto: contenido } : { telefono, ...contenido };
    const token = signToken(usuarios.find((u) => u.id === 1));
    const r = await call(server.baseUrl, 'POST', '/whatsapp/simulador', { token, body });
    if (r.status !== 200) throw new Error(`Simulador respondió ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body.respuestas;
  };
}

/** Texto visible de cada mensaje del bot (texto simple o cuerpo de botones/lista). */
const textos = (respuestas) => respuestas.map((m) => m.text?.body || m.interactive?.body?.text);

/** Espera hasta que `condicion()` sea true (para trabajo que corre después de responder). */
async function esperar(condicion, ms = 2000) {
  const hasta = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > hasta) throw new Error('Tiempo de espera agotado');
    await new Promise((r) => setTimeout(r, 10));
  }
}

module.exports = { usuarios, clientes, mensajesProcesados, sesionesChat, consentimientos, productos, pedidos, pines, envios, reportes, resetUsuarios, startServer, call, esperar, crearChat, textos, PASSWORD };
