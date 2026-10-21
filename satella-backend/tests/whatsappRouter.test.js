process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { clientes, sesionesChat, resetUsuarios, startServer, crearChat, textos } = require('./helpers');
const { reiniciarLimites } = require('../src/services/whatsapp/entrada');
const sesiones = require('../src/services/whatsapp/sesiones');

let server;
let escribir;
before(async () => { server = await startServer(); escribir = crearChat(server); });
after(() => server.close());
beforeEach(() => { resetUsuarios(); reiniciarLimites(); });

const LAURA = '573114441001';      // cliente
const DIEGO = '573001112233';      // repartidor
const MARIA = '573004445566';      // operaria
const NUEVO = '573209998877';      // no registrado

const sesionDe = (telefono) => sesionesChat.find((s) => s.telefono === telefono);

// --- Identificación del perfil por teléfono ---

test('cliente conocido → menú con lista de 3 opciones y su nombre', async () => {
  const [menu] = await escribir(LAURA, 'hola');
  assert.equal(menu.interactive.type, 'list');
  assert.match(menu.interactive.body.text, /Hola Laura/);
  assert.deepEqual(menu.interactive.action.sections[0].rows.map((r) => r.id), ['menu:pedido', 'menu:mis-pedidos', 'menu:direccion']);
  assert.equal(sesionDe(LAURA).flujo, 'cliente');
});

test('número desconocido → flujo de registro (empieza por el consentimiento)', async () => {
  assert.match(textos(await escribir(NUEVO, 'hola'))[0], /bienvenida.*Ley 1581/s);
  assert.equal(sesionDe(NUEVO).flujo, 'registro');
  assert.equal(sesionDe(NUEVO).paso, 'consentimiento');
});

test('repartidor → su propio flujo (sin funciones antes del PIN)', async () => {
  const [m] = await escribir(DIEGO, 'hola');
  assert.match(m.text.body, /Hola Diego/);
  assert.equal(sesionDe(DIEGO).flujo, 'repartidor');
});

test('operaria → mensaje informativo, y queda abierta su ventana de 24 h', async () => {
  assert.equal(await sesiones.ventanaAbierta(MARIA), false);
  const [m] = await escribir(MARIA, 'hola');
  assert.match(m.text.body, /Hola María.*24 horas/);
  assert.equal(await sesiones.ventanaAbierta(MARIA), true);
  const horas = (new Date(sesionDe(MARIA).ventanaHasta) - Date.now()) / 3600000;
  assert.ok(horas > 23.9 && horas <= 24, `ventana de ${horas} h`);
});

test('el perfil lo decide el teléfono, no lo que diga el usuario', async () => {
  await escribir(NUEVO, 'hola');
  // Aunque escriba "soy repartidor", sigue en registro (y se le repite qué se espera).
  const r = textos(await escribir(NUEVO, 'soy repartidor'));
  assert.match(r[0], /No entendí/);
  assert.match(r[1], /Ley 1581/);
  assert.equal(sesionDe(NUEVO).flujo, 'registro');
});

test('si el perfil cambia (ej. el número nuevo se registró), arranca el flujo nuevo', async () => {
  await escribir(NUEVO, 'hola');
  clientes.push({ id: 2, nombre: 'Pedro Nuevo', telefono: NUEVO });
  const [menu] = await escribir(NUEVO, 'hola');
  assert.match(menu.interactive.body.text, /Hola Pedro/);
  assert.equal(sesionDe(NUEVO).flujo, 'cliente');
});

// --- Opciones: solo se aceptan las ofrecidas ---

test('elegir una opción del menú por botón/lista', async () => {
  await escribir(LAURA, 'hola');
  const r = textos(await escribir(LAURA, { opcionId: 'menu:pedido', opcionTexto: 'Hacer pedido' }));
  assert.match(r[0], /disponible muy pronto/);
});

test('también se puede responder escribiendo el número o el nombre de la opción', async () => {
  await escribir(LAURA, 'hola');
  assert.match(textos(await escribir(LAURA, '2'))[0], /disponible muy pronto/);
  await escribir(LAURA, 'menu');
  assert.match(textos(await escribir(LAURA, 'Mis Pedidos'))[0], /disponible muy pronto/);
});

test('un id que no se ofreció se rechaza y se repite el menú', async () => {
  await escribir(LAURA, 'hola');
  const r = await escribir(LAURA, { opcionId: 'envio:entregar:99', opcionTexto: 'Entregar' });
  assert.match(r[0].text.body, /No entendí/);
  assert.equal(r[1].interactive.type, 'list');
  assert.equal(sesionDe(LAURA).paso, 'menu');
});

test('texto inesperado → recordatorio de qué se espera, sin romper el flujo', async () => {
  await escribir(LAURA, 'hola');
  const r = await escribir(LAURA, 'quiero un unicornio');
  assert.match(r[0].text.body, /Elige una de las opciones/);
  assert.equal(r[1].interactive.type, 'list');
  assert.equal(sesionDe(LAURA).paso, 'menu');
});

test('número fuera de rango no es una opción válida', async () => {
  await escribir(LAURA, 'hola');
  assert.match(textos(await escribir(LAURA, '7'))[0], /No entendí/);
});

// --- Comandos globales e inactividad ---

test('"menu" (con o sin tilde, en mayúsculas) reinicia y muestra el menú', async () => {
  await escribir(LAURA, 'hola');
  await escribir(LAURA, '1');
  for (const cmd of ['menu', 'Menú', ' MENU ']) {
    const [m] = await escribir(LAURA, cmd);
    assert.equal(m.interactive.type, 'list', cmd);
  }
});

test('"cancelar" confirma y vuelve al menú', async () => {
  await escribir(LAURA, 'hola');
  const r = await escribir(LAURA, 'Cancelar');
  assert.match(r[0].text.body, /cancelé/);
  assert.equal(r[1].interactive.type, 'list');
});

test('sesión inactiva más de 30 minutos → avisa y empieza de nuevo', async () => {
  await escribir(LAURA, 'hola');
  sesionDe(LAURA).actualizadaEn = new Date(Date.now() - 31 * 60 * 1000);
  const r = await escribir(LAURA, '2');
  assert.match(r[0].text.body, /inactividad/);
  assert.equal(r[1].interactive.type, 'list');
});

test('con menos de 30 minutos de inactividad la conversación sigue', async () => {
  await escribir(LAURA, 'hola');
  sesionDe(LAURA).actualizadaEn = new Date(Date.now() - 29 * 60 * 1000);
  assert.match(textos(await escribir(LAURA, '2'))[0], /disponible muy pronto/);
});

test('después de terminar una opción, el siguiente mensaje vuelve a mostrar el menú', async () => {
  await escribir(LAURA, 'hola');
  await escribir(LAURA, '1');
  const [m] = await escribir(LAURA, 'gracias');
  assert.equal(m.interactive.type, 'list');
});

test('reiniciar la conversación no borra la verificación ni el bloqueo del PIN', async () => {
  await escribir(DIEGO, 'hola');
  const hasta = new Date(Date.now() + 10 * 60 * 1000);
  Object.assign(sesionDe(DIEGO), { bloqueadoHasta: hasta, intentosFallidos: 3, verificadoHasta: hasta });
  await escribir(DIEGO, 'cancelar');
  const s = sesionDe(DIEGO);
  assert.equal(s.intentosFallidos, 3);
  assert.equal(new Date(s.bloqueadoHasta).getTime(), hasta.getTime());
  assert.equal(new Date(s.verificadoHasta).getTime(), hasta.getTime());
});
