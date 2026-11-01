process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { clientes, sesionesChat, consentimientos, resetUsuarios, startServer, crearChat, textos } = require('./helpers');
const { reiniciarLimites } = require('../src/services/whatsapp/entrada');
const { CONSENTIMIENTO_VERSION } = require('../src/services/whatsapp/flows/registro');

let server;
let escribir;
before(async () => { server = await startServer(); escribir = crearChat(server); });
after(() => server.close());
beforeEach(() => { resetUsuarios(); reiniciarLimites(); });

const NUEVO = '573209998877';
const sesion = () => sesionesChat.find((s) => s.telefono === NUEVO);
const acepto = { opcionId: 'consent:si', opcionTexto: 'Acepto', wamid: 'wamid.acepto-123' };

async function registrarHastaResumen() {
  await escribir(NUEVO, 'hola');
  await escribir(NUEVO, acepto);
  await escribir(NUEVO, 'Pedro Pablo Gómez');
  await escribir(NUEVO, 'Calle 45 #12-30, apto 301');
  return escribir(NUEVO, 'Fusagasugá');
}

test('primer mensaje: aviso de tratamiento de datos con botones Acepto / No acepto', async () => {
  const [m] = await escribir(NUEVO, 'hola');
  assert.equal(m.interactive.type, 'button');
  assert.match(m.interactive.body.text, /Ley 1581 de 2012/);
  assert.match(m.interactive.body.text, /responsable/);
  assert.match(m.interactive.body.text, /conocer, actualizar, rectificar/);
  assert.deepEqual(m.interactive.action.buttons.map((b) => b.reply.title), ['Acepto', 'No acepto']);
});

test('registro completo: crea el cliente activo y guarda la evidencia del consentimiento', async () => {
  const [resumen] = await registrarHastaResumen();
  assert.match(resumen.interactive.body.text, /Pedro Pablo Gómez/);
  assert.match(resumen.interactive.body.text, /Calle 45 #12-30, apto 301/);
  assert.match(resumen.interactive.body.text, /Fusagasugá/);
  assert.equal(clientes.length, 1, 'todavía no se guarda nada antes de confirmar');

  const r = textos(await escribir(NUEVO, { opcionId: 'reg:confirmar', opcionTexto: 'Sí, registrarme' }));
  assert.match(r[0], /Listo, Pedro.*registro quedó completo/);

  const cliente = clientes.find((c) => c.telefono === NUEVO);
  assert.deepEqual(
    { nombre: cliente.nombre, direccion: cliente.direccion, ciudad: cliente.ciudad },
    { nombre: 'Pedro Pablo Gómez', direccion: 'Calle 45 #12-30, apto 301', ciudad: 'Fusagasugá' },
  );
  assert.equal(consentimientos.length, 1);
  const c = consentimientos[0];
  assert.equal(c.telefono, NUEVO);
  assert.equal(c.clienteId, cliente.id);
  assert.equal(c.textoVersion, CONSENTIMIENTO_VERSION);
  assert.equal(c.wamid, 'wamid.acepto-123', 'guarda el id del mensaje con el que aceptó');
  assert.ok(c.aceptadoEn instanceof Date && Date.now() - c.aceptadoEn < 60000);

  // Queda activo: el siguiente mensaje ya es el menú del cliente.
  const [menu] = await escribir(NUEVO, 'menu');
  assert.match(menu.interactive.body.text, /Hola Pedro/);
});

test('"No acepto": no guarda ningún dato y borra la sesión', async () => {
  await escribir(NUEVO, 'hola');
  const r = textos(await escribir(NUEVO, { opcionId: 'consent:no', opcionTexto: 'No acepto' }));
  assert.match(r[0], /No guardamos ningún dato/);
  assert.equal(clientes.length, 1);
  assert.equal(consentimientos.length, 0);
  assert.equal(sesion(), undefined, 'tampoco queda la sesión con su número');
  // Si vuelve a escribir, se le pide el consentimiento de nuevo.
  assert.match(textos(await escribir(NUEVO, 'hola'))[0], /Ley 1581/);
});

test('se puede aceptar escribiendo "acepto"', async () => {
  await escribir(NUEVO, 'hola');
  assert.match(textos(await escribir(NUEVO, 'acepto')).join(' '), /nombre completo/);
});

test('no se pide ningún dato sin aceptar antes', async () => {
  await escribir(NUEVO, 'hola');
  const r = textos(await escribir(NUEVO, 'Pedro Gómez'));
  assert.match(r[0], /No entendí/);
  assert.equal(sesion().paso, 'consentimiento');
});

test('datos muy cortos se rechazan y se vuelve a preguntar', async () => {
  await escribir(NUEVO, 'hola');
  await escribir(NUEVO, acepto);
  const r = textos(await escribir(NUEVO, 'Al'));
  assert.match(r[0], /muy corto/);
  assert.match(r[1], /nombre completo/);
  assert.equal(sesion().paso, 'nombre');
});

test('corregir un dato vuelve directo al resumen', async () => {
  await registrarHastaResumen();
  await escribir(NUEVO, { opcionId: 'reg:corregir', opcionTexto: 'Corregir' });
  const r1 = textos(await escribir(NUEVO, { opcionId: 'corr:direccion', opcionTexto: 'Dirección' }));
  assert.match(r1[0], /dirección/);
  const [resumen] = await escribir(NUEVO, 'Carrera 7 #80-10');
  assert.match(resumen.interactive.body.text, /Carrera 7 #80-10/);
  assert.match(resumen.interactive.body.text, /Pedro Pablo Gómez/);
  await escribir(NUEVO, { opcionId: 'reg:confirmar', opcionTexto: 'Sí, registrarme' });
  assert.equal(clientes.find((c) => c.telefono === NUEVO).direccion, 'Carrera 7 #80-10');
});

test('"cancelar" a mitad del registro no guarda nada y vuelve al consentimiento', async () => {
  await escribir(NUEVO, 'hola');
  await escribir(NUEVO, acepto);
  await escribir(NUEVO, 'Pedro Pablo Gómez');
  const r = textos(await escribir(NUEVO, 'cancelar'));
  assert.match(r[0], /cancelé/);
  assert.match(r[1], /Ley 1581/);
  assert.equal(clientes.length, 1);
  assert.equal(consentimientos.length, 0);
});

test('si el número se registró mientras tanto (ej. desde el panel), no se duplica', async () => {
  await registrarHastaResumen();
  clientes.push({ id: 99, nombre: 'Registrado por el panel', telefono: NUEVO });
  // El router ya lo reconoce como cliente: pasa a su menú en vez de terminar el registro.
  const r = textos(await escribir(NUEVO, { opcionId: 'reg:confirmar', opcionTexto: 'Sí, registrarme' }));
  assert.match(r[0], /Hola Registrado/);
  assert.equal(clientes.filter((c) => c.telefono === NUEVO).length, 1);
  assert.equal(consentimientos.length, 0);
});

test('dos confirmaciones casi simultáneas: el índice único evita el duplicado', async () => {
  const registro = require('../src/services/whatsapp/flows/registro');
  const contexto = {
    nombre: 'Pedro', direccion: 'Calle 1 #2-3', ciudad: 'Soacha',
    consentimiento: { version: 'v1', aceptadoEn: new Date().toISOString(), wamid: 'w' },
  };
  const perfil = { telefono: NUEVO };
  const confirmar = () => registro.pasos.confirmar.recibir({ opcion: { id: 'reg:confirmar' } }, { perfil, contexto });
  const [a, b] = await Promise.all([confirmar(), confirmar()]);
  assert.equal(clientes.filter((c) => c.telefono === NUEVO).length, 1);
  assert.deepEqual([a.decir[0], b.decir[0]].map((t) => /ya quedó registrado/.test(t)).sort(), [false, true]);
});

test('los textos se limpian (sin caracteres de control ni espacios de más)', async () => {
  await escribir(NUEVO, 'hola');
  await escribir(NUEVO, acepto);
  await escribir(NUEVO, '  Pedro    Pablo\u0007  Gómez ');
  await escribir(NUEVO, 'Calle 45 #12-30');
  await escribir(NUEVO, 'Soacha');
  await escribir(NUEVO, { opcionId: 'reg:confirmar', opcionTexto: 'Sí, registrarme' });
  assert.equal(clientes.find((c) => c.telefono === NUEVO).nombre, 'Pedro Pablo Gómez');
});
