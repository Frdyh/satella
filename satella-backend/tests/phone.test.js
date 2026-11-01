const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizarTelefono } = require('../src/utils/phone');

test('celular colombiano en distintos formatos → mismo número con indicativo 57', () => {
  for (const entrada of ['311-444-1001', '311 444 1001', '(311) 444-1001', '3114441001', '+57 311 444 1001', '573114441001']) {
    assert.equal(normalizarTelefono(entrada), '573114441001', entrada);
  }
});

test('el formato que entrega Meta (sin "+", con indicativo) no cambia', () => {
  assert.equal(normalizarTelefono('573001112233'), '573001112233');
});

test('número de otro país con indicativo se conserva', () => {
  assert.equal(normalizarTelefono('+1 (415) 555-2671'), '14155552671');
});

test('vacíos y valores que no son teléfonos → null', () => {
  for (const entrada of [undefined, null, '', '   ', 'abc', '12345', '1234567890123456']) {
    assert.equal(normalizarTelefono(entrada), null, String(entrada));
  }
});

test('acepta números (no solo strings)', () => {
  assert.equal(normalizarTelefono(3114441001), '573114441001');
});
