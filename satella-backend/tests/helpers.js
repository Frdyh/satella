/**
 * Utilidades para probar la API sin MySQL: reemplaza src/lib/prisma.js por
 * una "base de datos" en memoria (solo la tabla Usuario, que es lo que usan
 * login, requireAuth y /api/usuarios) y levanta la app en un puerto libre.
 */
const path = require('path');

process.env.JWT_SECRET = 'secreto-de-prueba';

const { hashPassword } = require('../src/utils/password');

const usuarios = [];

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
      const u = usuarios.find((x) => (where.id !== undefined ? x.id === where.id : x.email === where.email));
      return u ? pickSelect(u, select) : null;
    },
    findMany: async ({ select } = {}) => usuarios.map((u) => pickSelect(u, select)),
    count: async () => usuarios.length,
    create: async ({ data, select }) => {
      if (usuarios.some((x) => x.email === data.email)) throw Object.assign(new Error('dup'), { code: 'P2002' });
      const u = { id: Math.max(0, ...usuarios.map((x) => x.id)) + 1, rol: null, ...data };
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
};

const prismaPath = path.join(__dirname, '../src/lib/prisma.js');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const PASSWORD = 'satella123';

/** Vuelve a dejar los tres usuarios del seed (admin id 1, operador id 2, despachador id 3). */
function resetUsuarios() {
  usuarios.length = 0;
  usuarios.push(
    { id: 1, nombre: 'Juan Valencia', rol: 'Administrador', email: 'juan@satella.local', passwordHash: hashPassword(PASSWORD) },
    { id: 2, nombre: 'María Fernanda López', rol: 'Operador', email: 'maria@satella.local', passwordHash: hashPassword(PASSWORD) },
    { id: 3, nombre: 'Carlos Pérez', rol: 'Despachador', email: 'carlos@satella.local', passwordHash: hashPassword(PASSWORD) },
  );
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

/** fetch + JSON: devuelve { status, body }. */
async function call(baseUrl, method, path, { token, body } = {}) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

module.exports = { usuarios, resetUsuarios, startServer, call, PASSWORD };
