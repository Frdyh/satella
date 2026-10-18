// Archivo aparte: el límite de intentos vive en memoria del proceso y, si se
// probara junto a los demás, bloquearía los otros tests de login.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { resetUsuarios, startServer, call } = require('./helpers');

let server;
before(async () => { resetUsuarios(); server = await startServer(); });
after(() => server.close());

test('después de 10 intentos de login en 15 minutos responde 429', async () => {
  const intentar = () => call(server.baseUrl, 'POST', '/auth/login', { body: { email: 'juan@satella.local', password: 'mala' } });
  for (let i = 0; i < 10; i++) assert.equal((await intentar()).status, 401);
  const { status, body } = await intentar();
  assert.equal(status, 429);
  assert.match(body.error, /Demasiados intentos/);
});
