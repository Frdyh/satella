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

// findUnique por cualquier campo único (id, email, telefono…).
const findBy = (rows, where) => rows.find((x) => Object.entries(where).every(([k, v]) => x[k] === v));

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
    findMany: async ({ select } = {}) => usuarios.map((u) => pickSelect(u, select)),
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
  },
  pedido: {
    create: async ({ data }) => {
      const { items, ...resto } = data;
      const p = { id: pedidos.length + 1, fecha: new Date(), ...resto, items: items.create.map((i) => ({ ...i })) };
      pedidos.push(p);
      return { ...p };
    },
    findMany: async ({ where, take }) => pedidos
      .filter((p) => p.clienteId === where.clienteId)
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, take)
      .map((p) => ({ ...p, envio: p.envio || null, items: p.items.map((i) => ({ ...i, producto: productos.find((x) => x.id === i.productoId) })) })),
  },
  consentimientoDatos: {
    create: async ({ data }) => {
      const c = { id: consentimientos.length + 1, ...data };
      consentimientos.push(c);
      return c;
    },
  },
  // Sin rollback real: suficiente para probar el camino feliz y los conflictos.
  $transaction: async (fn) => fn(fakePrisma),
  sesionChat: {
    findUnique: async ({ where }) => { const s = findBy(sesionesChat, where); return s ? JSON.parse(JSON.stringify(s)) : null; },
    upsert: async ({ where, create, update }) => {
      let s = findBy(sesionesChat, where);
      if (s) Object.assign(s, update, { actualizadaEn: new Date() });
      else sesionesChat.push((s = { id: sesionesChat.length + 1, intentosFallidos: 0, ...create, actualizadaEn: new Date() }));
      // Copia, como Prisma: el llamador no comparte el objeto guardado.
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

module.exports = { usuarios, clientes, mensajesProcesados, sesionesChat, consentimientos, productos, pedidos, resetUsuarios, startServer, call, esperar, crearChat, textos, PASSWORD };
