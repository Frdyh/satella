const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { usuarios, resetUsuarios, startServer, call, PASSWORD } = require('./helpers');
const { signToken } = require('../src/utils/token');

let server;
before(async () => { server = await startServer(); });
after(() => server.close());
beforeEach(resetUsuarios);

const api = (...args) => call(server.baseUrl, ...args);

// --- POST /api/auth/login ---

test('login correcto devuelve token y usuario sin passwordHash', async () => {
  const { status, body } = await api('POST', '/auth/login', { body: { email: 'juan@satella.local', password: PASSWORD } });
  assert.equal(status, 200);
  assert.ok(body.token);
  assert.equal(body.usuario.email, 'juan@satella.local');
  assert.equal(body.usuario.passwordHash, undefined);
});

test('login ignora mayúsculas y espacios en el email', async () => {
  const { status } = await api('POST', '/auth/login', { body: { email: '  JUAN@Satella.local ', password: PASSWORD } });
  assert.equal(status, 200);
});

test('login con contraseña incorrecta → 401', async () => {
  const { status, body } = await api('POST', '/auth/login', { body: { email: 'juan@satella.local', password: 'otra-cosa' } });
  assert.equal(status, 401);
  assert.equal(body.error, 'Correo o contraseña incorrectos');
});

test('login con usuario inexistente → mismo 401 y mismo mensaje (no revela qué correos existen)', async () => {
  const { status, body } = await api('POST', '/auth/login', { body: { email: 'nadie@satella.local', password: PASSWORD } });
  assert.equal(status, 401);
  assert.equal(body.error, 'Correo o contraseña incorrectos');
});

test('login sin campos → 400', async () => {
  const { status, body } = await api('POST', '/auth/login', { body: {} });
  assert.equal(status, 400);
  assert.match(body.error, /email, password/);
});

test('login de un usuario sin contraseña asignada → 401', async () => {
  usuarios[0].passwordHash = null;
  const { status } = await api('POST', '/auth/login', { body: { email: 'juan@satella.local', password: PASSWORD } });
  assert.equal(status, 401);
});

// --- requireAuth ---

test('ruta protegida sin token → 401', async () => {
  const { status } = await api('GET', '/usuarios');
  assert.equal(status, 401);
});

test('ruta protegida con token inválido → 401', async () => {
  const { status } = await api('GET', '/usuarios', { token: 'esto-no-es-un-jwt' });
  assert.equal(status, 401);
});

test('ruta protegida con token firmado con otro secreto → 401', async () => {
  const token = jwt.sign({ sub: 1 }, 'otro-secreto');
  const { status } = await api('GET', '/usuarios', { token });
  assert.equal(status, 401);
});

test('ruta protegida con token expirado → 401', async () => {
  const token = jwt.sign({ sub: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
  const { status, body } = await api('GET', '/usuarios', { token });
  assert.equal(status, 401);
  assert.equal(body.error, 'Sesión inválida o expirada');
});

test('token de un usuario que ya fue borrado → 401', async () => {
  const token = signToken(usuarios[2]);
  usuarios.splice(2, 1);
  const { status } = await api('GET', '/auth/me', { token });
  assert.equal(status, 401);
});

test('GET /auth/me con token válido devuelve el usuario', async () => {
  const { status, body } = await api('GET', '/auth/me', { token: signToken(usuarios[1]) });
  assert.equal(status, 200);
  assert.equal(body.email, 'maria@satella.local');
  assert.equal(body.passwordHash, undefined);
});

test('/api/health sigue siendo público', async () => {
  const { status } = await api('GET', '/health');
  assert.equal(status, 200);
});
