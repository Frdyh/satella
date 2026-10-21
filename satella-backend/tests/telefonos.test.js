const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { usuarios, resetUsuarios, startServer, call } = require('./helpers');
const { signToken } = require('../src/utils/token');

let server;
before(async () => { server = await startServer(); });
after(() => server.close());
beforeEach(resetUsuarios);

const api = (...args) => call(server.baseUrl, ...args);
const admin = () => signToken(usuarios.find((u) => u.id === 1));
const nuevo = (telefono) => ({ nombre: 'Nueva', email: `n${Date.now()}@x.co`, rol: 'Repartidor', password: '12345678', telefono });

test('el teléfono del usuario se guarda normalizado', async () => {
  const { status, body } = await api('POST', '/usuarios', { token: admin(), body: nuevo('300 999 8877') });
  assert.equal(status, 201);
  assert.equal(body.telefono, '573009998877');
});

test('teléfono inválido → 400', async () => {
  const { status, body } = await api('POST', '/usuarios', { token: admin(), body: nuevo('123') });
  assert.equal(status, 400);
  assert.match(body.error, /Teléfono inválido/);
});

test('teléfono vacío se guarda como null (el personal sin WhatsApp es válido)', async () => {
  const { status, body } = await api('POST', '/usuarios', { token: admin(), body: nuevo('') });
  assert.equal(status, 201);
  assert.equal(body.telefono, null);
});

test('no se puede repetir el teléfono de otro usuario, aunque venga en otro formato', async () => {
  const { status, body } = await api('POST', '/usuarios', { token: admin(), body: nuevo('300-111-2233') });
  assert.equal(status, 400);
  assert.match(body.error, /usuario del personal/);
});

test('un usuario no puede tener el teléfono de un cliente', async () => {
  const { status, body } = await api('POST', '/usuarios', { token: admin(), body: nuevo('+57 311 444 1001') });
  assert.equal(status, 400);
  assert.match(body.error, /cliente/);
});

test('al editar, conservar el propio teléfono no es un conflicto', async () => {
  const diego = usuarios.find((u) => u.id === 4);
  const { status } = await api('PUT', '/usuarios/4', {
    token: admin(),
    body: { nombre: diego.nombre, email: diego.email, rol: diego.rol, telefono: '3001112233' },
  });
  assert.equal(status, 200);
});
