// Archivo aparte: la ruta del simulador se decide al cargar la app.
delete process.env.ENABLE_WA_SIMULATOR;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { usuarios, resetUsuarios, startServer, call } = require('./helpers');
const { signToken } = require('../src/utils/token');

let server;
before(async () => { resetUsuarios(); server = await startServer(); });
after(() => server.close());

test('sin ENABLE_WA_SIMULATOR=true el simulador no existe (404), incluso con sesión', async () => {
  const token = signToken(usuarios.find((u) => u.id === 1));
  const { status } = await call(server.baseUrl, 'POST', '/whatsapp/simulador', { token, body: { telefono: '3114441001', texto: 'hola' } });
  assert.equal(status, 404);
});

test('sin WA_APP_SECRET el webhook rechaza todo (503)', async () => {
  delete process.env.WA_APP_SECRET;
  const original = console.error; console.error = () => {};
  const { status } = await call(server.baseUrl, 'POST', '/whatsapp/webhook', { raw: '{}', headers: { 'X-Hub-Signature-256': 'sha256=00' } });
  console.error = original;
  assert.equal(status, 503);
});
