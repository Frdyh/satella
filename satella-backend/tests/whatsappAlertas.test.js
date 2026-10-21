process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  usuarios, pedidos, envios, reportes, sesionesChat,
  resetUsuarios, startServer, call, crearChat, textos,
} = require('./helpers');
const { signToken } = require('../src/utils/token');
const { reiniciarLimites } = require('../src/services/whatsapp/entrada');

let server;
let escribir;
before(async () => { server = await startServer(); escribir = crearChat(server); });
after(() => server.close());

const DIEGO = '573001112233';
const MARIA = '573004445566';
const hoyA = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d; };

beforeEach(() => {
  resetUsuarios();
  reiniciarLimites();
  pedidos.push({ id: 1, clienteId: 1, items: [] });
  envios.push({ id: 11, pedidoId: 1, repartidorId: 4, estado: 'en ruta', ventanaHoraria: '10:00 - 12:00', fechaProgramada: hoyA(10) });
});

const api = (...args) => call(server.baseUrl, ...args);
const tokenDe = (id) => signToken(usuarios.find((u) => u.id === id));
const op = (opcionId) => ({ opcionId, opcionTexto: opcionId });

/** Diego entra con PIN y reporta "cliente ausente" en el envío 11. Devuelve todas las respuestas del último paso. */
async function reportarProblema(detalle = 'Nadie abre') {
  const { body } = await api('POST', '/usuarios/4/pin', { token: tokenDe(1), body: {} });
  await escribir(DIEGO, 'hola');
  await escribir(DIEGO, body.pin);
  await escribir(DIEGO, op('rep:problema'));
  await escribir(DIEGO, op('pen:11'));
  await escribir(DIEGO, op('prob:cliente_ausente'));
  return escribir(DIEGO, detalle);
}

// --- Aviso por WhatsApp al operario ---

test('operaria con ventana de 24 h abierta: recibe el aviso por WhatsApp', async () => {
  await escribir(MARIA, 'hola'); // abre su ventana
  const r = await reportarProblema();
  const alerta = r.find((m) => m.to === MARIA);
  assert.ok(alerta, 'hay un mensaje para María');
  assert.match(alerta.text.body, /Problema en el envío #11/);
  assert.match(alerta.text.body, /Reportado por Diego Ramírez/);
  assert.match(alerta.text.body, /Cliente ausente: "Nadie abre"/);
  assert.match(alerta.text.body, /Laura Gómez · 10:00 - 12:00/);
  const alRepartidor = r.find((m) => m.to === DIEGO);
  assert.match(alRepartidor.text.body, /avisé por WhatsApp a un operario/);
});

test('operaria sin ventana abierta: NO se le escribe (no hay plantillas), pero el reporte queda', async () => {
  const r = await reportarProblema();
  assert.ok(!r.some((m) => m.to === MARIA));
  assert.ok(!textos(r).join(' ').includes('avisé'));
  assert.equal(reportes.length, 1);
});

test('ventana vencida (más de 24 h desde su último mensaje) → no se le escribe', async () => {
  await escribir(MARIA, 'hola');
  sesionesChat.find((s) => s.telefono === MARIA).ventanaHasta = new Date(Date.now() - 1000);
  const r = await reportarProblema();
  assert.ok(!r.some((m) => m.to === MARIA));
});

test('solo se avisa a Operadores (no al administrador ni a otros repartidores)', async () => {
  usuarios.find((u) => u.id === 1).telefono = '573009990000';
  await escribir('573009990000', 'hola');
  await escribir(MARIA, 'hola');
  const r = await reportarProblema();
  assert.deepEqual(r.filter((m) => m.to !== DIEGO).map((m) => m.to), [MARIA]);
});

// --- Alertas en el panel ---

test('las alertas abiertas aparecen en el panel con envío, cliente y repartidor', async () => {
  await reportarProblema('Portón cerrado');
  const { status, body, } = await api('GET', '/alertas?estado=abierto', { token: tokenDe(3) });
  assert.equal(status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].tipo, 'cliente_ausente');
  assert.equal(body[0].detalle, 'Portón cerrado');
  assert.equal(body[0].envio.id, 11);
  assert.equal(body[0].envio.pedido.cliente.nombre, 'Laura Gómez');
  assert.equal(body[0].usuario.nombre, 'Diego Ramírez');
});

test('marcar atendida guarda quién la atendió y ya no sale en abiertas', async () => {
  await reportarProblema();
  const r = await api('PUT', '/alertas/1/atender', { token: tokenDe(2), body: {} });
  assert.equal(r.status, 200);
  assert.equal(r.body.estado, 'atendido');
  assert.equal(r.body.atendidoPor.nombre, 'María Fernanda López');
  assert.equal((await api('GET', '/alertas?estado=abierto', { token: tokenDe(2) })).body.length, 0);
  assert.equal((await api('GET', '/alertas?estado=atendido', { token: tokenDe(2) })).body.length, 1);
});

test('atender dos veces → 409; alerta inexistente → 404; estado inválido → 400', async () => {
  await reportarProblema();
  await api('PUT', '/alertas/1/atender', { token: tokenDe(1), body: {} });
  assert.equal((await api('PUT', '/alertas/1/atender', { token: tokenDe(1), body: {} })).status, 409);
  assert.equal((await api('PUT', '/alertas/99/atender', { token: tokenDe(1), body: {} })).status, 404);
  assert.equal((await api('GET', '/alertas?estado=raro', { token: tokenDe(1) })).status, 400);
});

test('solo Administrador u Operador marcan alertas atendidas', async () => {
  await reportarProblema();
  assert.equal((await api('PUT', '/alertas/1/atender', { token: tokenDe(3), body: {} })).status, 403);
  assert.equal((await api('PUT', '/alertas/1/atender', { token: tokenDe(4), body: {} })).status, 403);
});

test('las alertas exigen sesión del panel', async () => {
  assert.equal((await api('GET', '/alertas')).status, 401);
});
