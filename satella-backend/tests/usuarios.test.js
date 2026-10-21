const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { usuarios, resetUsuarios, startServer, call, PASSWORD } = require('./helpers');
const { signToken } = require('../src/utils/token');

let server;
before(async () => { server = await startServer(); });
after(() => server.close());
beforeEach(resetUsuarios);

const api = (...args) => call(server.baseUrl, ...args);
const admin = () => signToken(usuarios.find((u) => u.id === 1));
const despachador = () => signToken(usuarios.find((u) => u.id === 3));
const juan = (extra = {}) => ({ nombre: 'Juan Valencia', email: 'juan@satella.local', rol: 'Administrador', ...extra });
const carlos = (extra = {}) => ({ nombre: 'Carlos Pérez', email: 'carlos@satella.local', rol: 'Despachador', ...extra });

async function puedeEntrar(email, password) {
  const { status } = await api('POST', '/auth/login', { body: { email, password } });
  return status === 200;
}

// --- Escalación de privilegios (hallazgo #1 de la auditoría) ---

test('un Despachador NO puede cambiarle la contraseña al Administrador', async () => {
  const { status } = await api('PUT', '/usuarios/1', { token: despachador(), body: juan({ password: 'hackeado123' }) });
  assert.equal(status, 403);
  assert.equal(await puedeEntrar('juan@satella.local', 'hackeado123'), false);
  assert.equal(await puedeEntrar('juan@satella.local', PASSWORD), true);
});

test('un Despachador NO puede subirse a Administrador', async () => {
  const { status } = await api('PUT', '/usuarios/3', { token: despachador(), body: carlos({ rol: 'Administrador' }) });
  assert.equal(status, 403);
  assert.equal(usuarios.find((u) => u.id === 3).rol, 'Despachador');
});

test('un Despachador NO puede crear usuarios', async () => {
  const { status } = await api('POST', '/usuarios', {
    token: despachador(),
    body: { nombre: 'Intruso', email: 'intruso@x.co', rol: 'Administrador', password: '12345678' },
  });
  assert.equal(status, 403);
  assert.equal(usuarios.length, 4);
});

test('un Despachador NO puede borrar usuarios', async () => {
  const { status } = await api('DELETE', '/usuarios/1', { token: despachador() });
  assert.equal(status, 403);
  assert.equal(usuarios.length, 4);
});

test('un Despachador SÍ puede cambiar su propia contraseña', async () => {
  const { status } = await api('PUT', '/usuarios/3', { token: despachador(), body: carlos({ password: 'mi-clave-nueva' }) });
  assert.equal(status, 200);
  assert.equal(await puedeEntrar('carlos@satella.local', 'mi-clave-nueva'), true);
});

test('el Administrador puede editar a otros, cambiar roles y contraseñas', async () => {
  const { status, body } = await api('PUT', '/usuarios/3', { token: admin(), body: carlos({ rol: 'Operador', password: 'nueva-clave-1' }) });
  assert.equal(status, 200);
  assert.equal(body.rol, 'Operador');
  assert.equal(await puedeEntrar('carlos@satella.local', 'nueva-clave-1'), true);
});

test('el Administrador no puede quitarse a sí mismo el rol', async () => {
  const { status } = await api('PUT', '/usuarios/1', { token: admin(), body: juan({ rol: 'Operador' }) });
  assert.equal(status, 400);
  assert.equal(usuarios.find((u) => u.id === 1).rol, 'Administrador');
});

test('el Administrador no puede borrarse a sí mismo', async () => {
  const { status } = await api('DELETE', '/usuarios/1', { token: admin() });
  assert.equal(status, 400);
});

test('el Administrador puede borrar a otro usuario', async () => {
  const { status } = await api('DELETE', '/usuarios/3', { token: admin() });
  assert.equal(status, 204);
  assert.equal(usuarios.length, 3);
});

// --- Contraseñas ---

test('crear usuario exige contraseña de mínimo 8 caracteres', async () => {
  const base = { nombre: 'Ana', email: 'ana@x.co', rol: 'Operador' };
  assert.equal((await api('POST', '/usuarios', { token: admin(), body: base })).status, 400);
  assert.equal((await api('POST', '/usuarios', { token: admin(), body: { ...base, password: '1234567' } })).status, 400);
  const ok = await api('POST', '/usuarios', { token: admin(), body: { ...base, password: '12345678' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.passwordHash, undefined);
});

test('editar sin enviar contraseña conserva la actual', async () => {
  const { status } = await api('PUT', '/usuarios/3', { token: admin(), body: carlos({ nombre: 'Carlos P.' }) });
  assert.equal(status, 200);
  assert.equal(await puedeEntrar('carlos@satella.local', PASSWORD), true);
});

test('la contraseña se guarda con hash, nunca en texto plano', async () => {
  await api('PUT', '/usuarios/3', { token: despachador(), body: carlos({ password: 'mi-clave-nueva' }) });
  const hash = usuarios.find((u) => u.id === 3).passwordHash;
  assert.ok(!hash.includes('mi-clave-nueva'));
  assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('ni el listado ni el detalle exponen passwordHash', async () => {
  const list = await api('GET', '/usuarios', { token: despachador() });
  assert.equal(list.status, 200);
  assert.ok(list.body.every((u) => u.passwordHash === undefined));
  const one = await api('GET', '/usuarios/1', { token: despachador() });
  assert.equal(one.body.passwordHash, undefined);
});
