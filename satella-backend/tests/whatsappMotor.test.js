const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizar, resolverOpcion } = require('../src/services/whatsapp/motor');

const opciones = [{ id: 'a', titulo: 'Hacer pedido' }, { id: 'b', titulo: 'Mis pedidos' }];

test('normalizar quita tildes, mayúsculas y espacios', () => {
  assert.equal(normalizar('  Menú '), 'menu');
  assert.equal(normalizar('CANCELÁR'), 'cancelar');
});

test('resolverOpcion: por id, por número o por título', () => {
  assert.equal(resolverOpcion({ tipo: 'opcion', opcionId: 'b' }, opciones).id, 'b');
  assert.equal(resolverOpcion({ tipo: 'texto', texto: '1' }, opciones).id, 'a');
  assert.equal(resolverOpcion({ tipo: 'texto', texto: 'mis PEDIDOS' }, opciones).id, 'b');
});

test('resolverOpcion: ids no ofrecidos, números fuera de rango y otros tipos → null', () => {
  assert.equal(resolverOpcion({ tipo: 'opcion', opcionId: 'z' }, opciones), null);
  assert.equal(resolverOpcion({ tipo: 'texto', texto: '0' }, opciones), null);
  assert.equal(resolverOpcion({ tipo: 'texto', texto: '3' }, opciones), null);
  assert.equal(resolverOpcion({ tipo: 'texto', texto: '1.5' }, opciones), null);
  assert.equal(resolverOpcion({ tipo: 'otro', texto: '' }, opciones), null);
});
