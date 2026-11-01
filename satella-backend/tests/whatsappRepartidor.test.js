process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  usuarios, clientes, pedidos, pines, envios, reportes, sesionesChat,
  resetUsuarios, startServer, call, crearChat, textos,
} = require('./helpers');
const { signToken } = require('../src/utils/token');
const { reiniciarLimites } = require('../src/services/whatsapp/entrada');

let server;
let escribir;
before(async () => { server = await startServer(); escribir = crearChat(server); });
after(() => server.close());

const DIEGO = '573001112233';
const hoyA = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d; };
const ayer = () => { const d = hoyA(10); d.setDate(d.getDate() - 1); return d; };

beforeEach(() => {
  resetUsuarios();
  reiniciarLimites();
  // Otro repartidor, para comprobar que nadie ve ni toca envíos ajenos.
  usuarios.push({ id: 5, nombre: 'Otro Repartidor', rol: 'Repartidor', email: 'otro@x.co', telefono: '573005550000' });
  clientes.push({ id: 2, nombre: 'Andrés Ruiz', telefono: '573124441002', direccion: 'Av. 1 de Mayo #8-14', ciudad: 'Soacha' });
  pedidos.push(
    { id: 1, clienteId: 1, items: [] },
    { id: 2, clienteId: 2, items: [], whatsappNotas: 'Pedido hecho por WhatsApp · Entregar en: Oficina Calle 80' },
    { id: 3, clienteId: 1, items: [] },
    { id: 4, clienteId: 2, items: [] },
  );
  envios.push(
    { id: 11, pedidoId: 1, repartidorId: 4, estado: 'en cola', ventanaHoraria: '10:00 - 12:00', fechaProgramada: hoyA(10) },
    { id: 12, pedidoId: 2, repartidorId: 4, estado: 'en ruta', ventanaHoraria: '08:00 - 10:00', fechaProgramada: hoyA(8) },
    { id: 13, pedidoId: 3, repartidorId: 5, estado: 'en ruta', ventanaHoraria: '08:00 - 10:00', fechaProgramada: hoyA(8) },
    { id: 14, pedidoId: 4, repartidorId: 4, estado: 'en ruta', ventanaHoraria: '14:00 - 16:00', fechaProgramada: ayer() },
  );
});

const tokenDe = (id) => signToken(usuarios.find((u) => u.id === id));
const generarPin = (usuarioId = 4, quien = 1) => call(server.baseUrl, 'POST', `/usuarios/${usuarioId}/pin`, { token: tokenDe(quien), body: {} });
const op = (opcionId, opcionTexto = opcionId) => ({ opcionId, opcionTexto });
const filas = (m) => m.interactive.action.sections[0].rows;
const sesion = () => sesionesChat.find((s) => s.telefono === DIEGO);

/** Pide un PIN en el panel y lo escribe en el chat: deja a Diego en su menú. */
async function entrar() {
  const { body } = await generarPin();
  await escribir(DIEGO, 'hola');
  return escribir(DIEGO, body.pin);
}

// --- Generador de PIN en el panel ---

test('el panel genera un PIN de 6 dígitos que vence en 10 min; en la base solo queda el hash', async () => {
  const { status, body } = await generarPin();
  assert.equal(status, 201);
  assert.match(body.pin, /^\d{6}$/);
  const minutos = (new Date(body.expiraEn) - Date.now()) / 60000;
  assert.ok(minutos > 9.9 && minutos <= 10);
  assert.equal(pines.length, 1);
  assert.ok(!pines[0].hash.includes(body.pin));
  assert.match(pines[0].hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('solo Administrador u Operador generan PIN; solo para repartidores con teléfono', async () => {
  assert.equal((await generarPin(4, 2)).status, 201, 'operadora');
  assert.equal((await generarPin(4, 3)).status, 403, 'despachador');
  assert.equal((await generarPin(4, 4)).status, 403, 'el propio repartidor');
  assert.equal((await generarPin(2, 1)).status, 400, 'una operadora no es repartidora');
  usuarios.find((u) => u.id === 4).telefono = null;
  assert.equal((await generarPin(4, 1)).status, 400, 'sin teléfono');
});

// --- PIN en el chat ---

test('PIN correcto → menú del repartidor', async () => {
  const r = await entrar();
  assert.match(r[0].text.body, /PIN correcto/);
  assert.deepEqual(filas(r[1]).map((x) => x.title), ['Mi ruta', 'Confirmar entrega', 'Reportar problema']);
  const min = (new Date(sesion().verificadoHasta) - Date.now()) / 60000;
  assert.ok(min > 14.9 && min <= 15, 'verificado por 15 minutos');
});

test('el PIN sirve una sola vez', async () => {
  const { body } = await generarPin();
  await escribir(DIEGO, 'hola');
  await escribir(DIEGO, body.pin);
  sesion().verificadoHasta = new Date(Date.now() - 1000);
  await escribir(DIEGO, 'menu');
  assert.match(textos(await escribir(DIEGO, body.pin))[0], /incorrecto o vencido/);
});

test('un PIN vencido no sirve', async () => {
  const { body } = await generarPin();
  pines[0].expiraEn = new Date(Date.now() - 1000);
  await escribir(DIEGO, 'hola');
  assert.match(textos(await escribir(DIEGO, body.pin))[0], /incorrecto o vencido/);
});

test('generar un PIN nuevo invalida el anterior', async () => {
  const viejo = (await generarPin()).body.pin;
  const nuevo = (await generarPin()).body.pin;
  await escribir(DIEGO, 'hola');
  if (viejo !== nuevo) assert.match(textos(await escribir(DIEGO, viejo))[0], /incorrecto o vencido/);
  assert.match(textos(await escribir(DIEGO, nuevo))[0], /PIN correcto/);
});

test('el PIN de un repartidor no sirve para otro', async () => {
  const { body } = await generarPin(5);
  await escribir(DIEGO, 'hola');
  assert.match(textos(await escribir(DIEGO, body.pin))[0], /incorrecto/);
});

test('3 intentos fallidos → bloqueo de 15 min, aunque luego tenga el PIN bueno', async () => {
  const { body } = await generarPin();
  const malo = body.pin === '000000' ? '111111' : '000000';
  await escribir(DIEGO, 'hola');
  assert.match(textos(await escribir(DIEGO, malo))[0], /quedan 2 intentos/);
  assert.match(textos(await escribir(DIEGO, malo))[0], /queda 1 intento/);
  assert.match(textos(await escribir(DIEGO, malo))[0], /bloqueado 15 min/);
  const min = (new Date(sesion().bloqueadoHasta) - Date.now()) / 60000;
  assert.ok(min > 14.9 && min <= 15);
  // Ni con el PIN correcto, ni con "cancelar", ni con "menu".
  assert.match(textos(await escribir(DIEGO, body.pin))[0], /bloqueado/);
  assert.match(textos(await escribir(DIEGO, 'cancelar')).join(' '), /bloqueado/);
  assert.match(textos(await escribir(DIEGO, 'menu'))[0], /bloqueado/);
});

test('al terminar el bloqueo se puede volver a intentar', async () => {
  const { body } = await generarPin();
  await escribir(DIEGO, 'hola');
  for (let i = 0; i < 3; i++) await escribir(DIEGO, '999999' === body.pin ? '888888' : '999999');
  sesion().bloqueadoHasta = new Date(Date.now() - 1000);
  await escribir(DIEGO, 'hola');
  assert.match(textos(await escribir(DIEGO, body.pin))[0], /PIN correcto/);
});

test('texto que no tiene forma de PIN no gasta intentos', async () => {
  await generarPin();
  await escribir(DIEGO, 'hola');
  assert.match(textos(await escribir(DIEGO, 'no me acuerdo'))[0], /6 números/);
  assert.equal(sesion().intentosFallidos || 0, 0);
});

test('sin PIN no hay ninguna función: un id del menú del repartidor se rechaza', async () => {
  await escribir(DIEGO, 'hola');
  const r = textos(await escribir(DIEGO, op('rep:ruta', 'Mi ruta')));
  assert.match(r[0], /escribiendo un mensaje de texto/);
  assert.match(r[1], /PIN de 6 dígitos/);
  assert.equal(sesion().paso, 'pin');
  assert.ok(!r.join(' ').includes('ruta de hoy'));
});

test('si la verificación vence a mitad de una acción, se pide el PIN otra vez', async () => {
  await entrar();
  await escribir(DIEGO, op('rep:entregar'));
  sesion().verificadoHasta = new Date(Date.now() - 1000);
  const r = textos(await escribir(DIEGO, op('ent:12')));
  assert.match(r[0], /verificación venció/);
  assert.match(r[1], /PIN de 6 dígitos/);
  assert.equal(envios.find((e) => e.id === 12).estado, 'en ruta', 'no se tocó el envío');
});

test('con la verificación vigente, "menu" lleva directo al menú (sin pedir PIN)', async () => {
  await entrar();
  const [m] = await escribir(DIEGO, 'menu');
  assert.equal(m.interactive.type, 'list');
});

// --- Mi ruta ---

test('mi ruta: solo sus envíos de HOY, ordenados por ventana horaria', async () => {
  await entrar();
  const [r] = textos(await escribir(DIEGO, op('rep:ruta')));
  assert.match(r, /Tu ruta de hoy\* \(2 envíos\)/);
  assert.ok(r.indexOf('#12') < r.indexOf('#11'), '08:00 antes que 10:00');
  assert.ok(!r.includes('#13'), 'no muestra envíos de otro repartidor');
  assert.ok(!r.includes('#14'), 'no muestra envíos de ayer');
  assert.match(r, /Oficina Calle 80/, 'usa la dirección que el cliente pidió para ese pedido');
  assert.match(r, /Laura Gómez · 📞 \+573114441001/);
});

// --- Confirmar entrega ---

test('confirmar entrega: solo ofrece sus envíos en ruta y los marca entregados', async () => {
  await entrar();
  const [lista] = await escribir(DIEGO, op('rep:entregar'));
  assert.deepEqual(filas(lista).map((f) => f.id), ['ent:12'], 'ni el 11 (en cola), ni el 13 (de otro), ni el 14 (de ayer)');
  const [conf] = await escribir(DIEGO, op('ent:12'));
  assert.match(conf.interactive.body.text, /#12.*Andrés Ruiz/s);
  const r = textos(await escribir(DIEGO, op('cent:si')));
  assert.match(r[0], /#12 marcado como \*entregado\*/);
  assert.equal(envios.find((e) => e.id === 12).estado, 'entregado');
});

test('no puede confirmar un envío de otro repartidor aunque mande su id', async () => {
  await entrar();
  await escribir(DIEGO, op('rep:entregar'));
  const r = textos(await escribir(DIEGO, op('ent:13')));
  assert.match(r[0], /No entendí/);
  assert.equal(envios.find((e) => e.id === 13).estado, 'en ruta');
});

test('si le reasignan el envío mientras confirma, no lo puede marcar', async () => {
  await entrar();
  await escribir(DIEGO, op('rep:entregar'));
  await escribir(DIEGO, op('ent:12'));
  envios.find((e) => e.id === 12).repartidorId = 5;
  assert.match(textos(await escribir(DIEGO, op('cent:si')))[0], /ya no está disponible/);
  assert.equal(envios.find((e) => e.id === 12).estado, 'en ruta');
});

// --- Reportar problema ---

test('reportar problema con detalle: crea el reporte y deja el envío en retraso', async () => {
  await entrar();
  const [lista] = await escribir(DIEGO, op('rep:problema'));
  assert.deepEqual(filas(lista).map((f) => f.id), ['pen:12', 'pen:11']);
  const [tipos] = await escribir(DIEGO, op('pen:11'));
  assert.deepEqual(filas(tipos).map((f) => f.title), ['Cliente ausente', 'Dirección errónea', 'Producto dañado', 'Otro problema']);
  await escribir(DIEGO, op('prob:cliente_ausente'));
  const r = textos(await escribir(DIEGO, 'Nadie abre, llamé 2 veces'));
  assert.match(r[0], /Reporte #1 registrado/);
  assert.deepEqual(
    { envioId: reportes[0].envioId, usuarioId: reportes[0].usuarioId, tipo: reportes[0].tipo, detalle: reportes[0].detalle, estado: reportes[0].estado },
    { envioId: 11, usuarioId: 4, tipo: 'cliente_ausente', detalle: 'Nadie abre, llamé 2 veces', estado: 'abierto' },
  );
  assert.equal(envios.find((e) => e.id === 11).estado, 'retraso');
});

test('reportar problema sin detalle ("Omitir"), tipo "otro": no cambia el estado del envío', async () => {
  await entrar();
  await escribir(DIEGO, op('rep:problema'));
  await escribir(DIEGO, op('pen:12'));
  await escribir(DIEGO, op('prob:otro'));
  await escribir(DIEGO, op('det:omitir', 'Omitir'));
  assert.equal(reportes[0].detalle, null);
  assert.equal(envios.find((e) => e.id === 12).estado, 'en ruta');
});

test('un envío en retraso todavía se puede confirmar como entregado', async () => {
  envios.find((e) => e.id === 12).estado = 'retraso';
  await entrar();
  const [lista] = await escribir(DIEGO, op('rep:entregar'));
  assert.ok(filas(lista).some((f) => f.id === 'ent:12'));
});
