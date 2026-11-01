const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { usuarios, productos, pedidos, resetUsuarios, startServer, call } = require('./helpers');
const { signToken } = require('../src/utils/token');

let server;
before(async () => { server = await startServer(); });
after(() => server.close());
beforeEach(() => {
  resetUsuarios();
  // Leche (id 1): stock 50 · Queso (id 2): stock 2
  pedidos.push(
    { id: 1, clienteId: 1, fecha: new Date(), estado: 'pendiente', items: [{ productoId: 1, cantidad: 10 }, { productoId: 2, cantidad: 1 }] },
    { id: 2, clienteId: 1, fecha: new Date(), estado: 'pendiente', items: [{ productoId: 2, cantidad: 2 }] },
    { id: 3, clienteId: 1, fecha: new Date(), estado: 'pendiente', items: [{ productoId: 1, cantidad: 5 }, { productoId: 2, cantidad: 3 }] },
  );
});

const api = (...args) => call(server.baseUrl, ...args);
const token = () => signToken(usuarios.find((u) => u.id === 2));
const stock = (id) => productos.find((p) => p.id === id).stockActual;
const cambiarEstado = (id, estado) => api('PUT', `/pedidos/${id}`, { token: token(), body: { clienteId: 1, estado } });

test('crear un pedido pendiente NO descuenta stock', async () => {
  const { status } = await api('POST', '/pedidos', { token: token(), body: { clienteId: 1, items: [{ productoId: 1, cantidad: 4 }] } });
  assert.equal(status, 201);
  assert.equal(stock(1), 50);
});

test('confirmar descuenta el stock de todos sus productos', async () => {
  const { status, body } = await cambiarEstado(1, 'confirmado');
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(stock(1), 40);
  assert.equal(stock(2), 1);
});

test('si un producto no alcanza, se rechaza con mensaje claro y no se descuenta NADA', async () => {
  const { status, body } = await cambiarEstado(3, 'confirmado');
  assert.equal(status, 409);
  assert.equal(body.error, 'No se puede confirmar el pedido. Stock insuficiente de Queso campesino: hay 2 y el pedido necesita 3.');
  assert.equal(stock(1), 50, 'la leche (que sí alcanzaba) tampoco se descontó');
  assert.equal(pedidos.find((p) => p.id === 3).estado, 'pendiente');
});

test('gana quien confirma primero: el segundo pedido ya no encuentra stock', async () => {
  assert.equal((await cambiarEstado(2, 'confirmado')).status, 200);
  const segundo = await cambiarEstado(1, 'confirmado');
  assert.equal(segundo.status, 409);
  assert.match(segundo.body.error, /Queso campesino: hay 0/);
  assert.equal(stock(2), 0);
});

test('confirmar dos veces el mismo pedido no descuenta dos veces', async () => {
  await cambiarEstado(1, 'confirmado');
  const otraVez = await cambiarEstado(1, 'confirmado');
  assert.equal(otraVez.status, 200);
  assert.equal(stock(1), 40);
});

test('cancelar un pedido confirmado devuelve el stock', async () => {
  await cambiarEstado(1, 'confirmado');
  assert.equal((await cambiarEstado(1, 'cancelado')).status, 200);
  assert.equal(stock(1), 50);
  assert.equal(stock(2), 2);
});

test('devolver un pedido confirmado a pendiente también devuelve el stock', async () => {
  await cambiarEstado(1, 'confirmado');
  await cambiarEstado(1, 'pendiente');
  assert.equal(stock(1), 50);
});

test('cancelar un pedido pendiente no toca el stock', async () => {
  await cambiarEstado(1, 'cancelado');
  assert.equal(stock(1), 50);
});

test('eliminar un pedido confirmado devuelve el stock; uno pendiente no', async () => {
  await cambiarEstado(1, 'confirmado');
  assert.equal((await api('DELETE', '/pedidos/1', { token: token() })).status, 204);
  assert.equal(stock(1), 50);
  await api('DELETE', '/pedidos/2', { token: token() });
  assert.equal(stock(2), 2);
});

test('crear un pedido directamente confirmado también descuenta (no hay atajo)', async () => {
  const ok = await api('POST', '/pedidos', { token: token(), body: { clienteId: 1, estado: 'confirmado', items: [{ productoId: 1, cantidad: 7 }] } });
  assert.equal(ok.status, 201);
  assert.equal(stock(1), 43);
  const sinStock = await api('POST', '/pedidos', { token: token(), body: { clienteId: 1, estado: 'confirmado', items: [{ productoId: 2, cantidad: 9 }] } });
  assert.equal(sinStock.status, 409);
  assert.equal(pedidos.length, 4, 'el pedido rechazado no se creó');
});

test('el mismo producto en dos items se suma para validar el stock', async () => {
  pedidos.push({ id: 4, clienteId: 1, fecha: new Date(), estado: 'pendiente', items: [{ productoId: 2, cantidad: 1 }, { productoId: 2, cantidad: 2 }] });
  const r = await cambiarEstado(4, 'confirmado');
  assert.equal(r.status, 409);
  assert.match(r.body.error, /hay 2 y el pedido necesita 3/);
});

test('pedido inexistente → 404', async () => {
  assert.equal((await cambiarEstado(99, 'confirmado')).status, 404);
});
