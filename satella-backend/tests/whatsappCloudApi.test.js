const { test } = require('node:test');
const assert = require('node:assert/strict');
const { payloadTexto, payloadBotones, payloadLista, crearSalida } = require('../src/services/whatsapp/cloudApi');

test('payload de texto', () => {
  assert.deepEqual(payloadTexto('573114441001', 'Hola'), {
    messaging_product: 'whatsapp', to: '573114441001', type: 'text', text: { body: 'Hola' },
  });
});

test('botones: formato de Meta y título cortado a 20 caracteres', () => {
  const p = payloadBotones('57300', '¿Aceptas?', [{ id: 'si', titulo: 'Acepto' }, { id: 'no', titulo: 'No acepto el tratamiento de datos' }]);
  assert.equal(p.interactive.type, 'button');
  assert.deepEqual(p.interactive.action.buttons[0], { type: 'reply', reply: { id: 'si', title: 'Acepto' } });
  assert.equal(p.interactive.action.buttons[1].reply.title.length, 20);
});

test('botones: más de 3 es un error de programación', () => {
  const b = { id: 'x', titulo: 'x' };
  assert.throws(() => payloadBotones('57300', 't', [b, b, b, b]), /de 1 a 3/);
  assert.throws(() => payloadBotones('57300', 't', []), /de 1 a 3/);
});

test('lista: formato de Meta, límites de título y descripción', () => {
  const p = payloadLista('57300', 'Elige', 'Ver productos', [
    { id: 'prod:1', titulo: 'Leche entera 1L larga vida extra', descripcion: 'd'.repeat(100) },
    { id: 'prod:2', titulo: 'Queso' },
  ]);
  assert.equal(p.interactive.type, 'list');
  assert.equal(p.interactive.action.button, 'Ver productos');
  const [r1, r2] = p.interactive.action.sections[0].rows;
  assert.equal(r1.title.length, 24);
  assert.equal(r1.description.length, 72);
  assert.equal(r2.description, undefined);
});

test('lista: más de 10 filas es un error de programación', () => {
  const filas = Array.from({ length: 11 }, (_, i) => ({ id: `f${i}`, titulo: `F${i}` }));
  assert.throws(() => payloadLista('57300', 't', 'Ver', filas), /de 1 a 10/);
});

test('en modo simulador no sale nada a internet: se acumula', async () => {
  const salida = crearSalida('573114441001', { modo: 'simulador' });
  await salida.texto('uno');
  await salida.botones('dos', [{ id: 'a', titulo: 'A' }]);
  assert.equal(salida.enviados.length, 2);
  assert.equal(salida.enviados[1].type, 'interactive');
});

test('en modo cloud sin credenciales no intenta enviar', async () => {
  delete process.env.WA_ACCESS_TOKEN;
  const original = console.error; console.error = () => {};
  const r = await crearSalida('573114441001').texto('hola');
  console.error = original;
  assert.deepEqual(r, { enviado: false, razon: 'sin configuración' });
});
