const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsearWebhook } = require('../src/services/whatsapp/parser');

// Estructura del webhook de mensajes según la documentación de WhatsApp Cloud API.
const webhook = (...messages) => ({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'WABA_ID',
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '15550000000', phone_number_id: 'PHONE_ID' },
        contacts: [{ profile: { name: 'Laura' }, wa_id: '573114441001' }],
        messages,
      },
    }],
  }],
});

test('mensaje de texto → tipo texto', () => {
  const [m] = parsearWebhook(webhook({ from: '573114441001', id: 'wamid.1', type: 'text', text: { body: '  Hola  ' } }));
  assert.deepEqual(m, { telefono: '573114441001', wamid: 'wamid.1', tipo: 'texto', texto: 'Hola', opcionId: null });
});

test('respuesta de botón → tipo opcion con su id', () => {
  const [m] = parsearWebhook(webhook({
    from: '573114441001', id: 'wamid.2', type: 'interactive',
    interactive: { type: 'button_reply', button_reply: { id: 'consent:si', title: 'Acepto' } },
  }));
  assert.equal(m.tipo, 'opcion');
  assert.equal(m.opcionId, 'consent:si');
  assert.equal(m.texto, 'Acepto');
});

test('respuesta de lista → tipo opcion con su id', () => {
  const [m] = parsearWebhook(webhook({
    from: '573114441001', id: 'wamid.3', type: 'interactive',
    interactive: { type: 'list_reply', list_reply: { id: 'prod:7', title: 'Queso campesino', description: '$12.000' } },
  }));
  assert.equal(m.tipo, 'opcion');
  assert.equal(m.opcionId, 'prod:7');
});

test('audio, imagen, etc. → tipo otro (no rompe)', () => {
  const [m] = parsearWebhook(webhook({ from: '573114441001', id: 'wamid.4', type: 'audio', audio: { id: 'MEDIA' } }));
  assert.equal(m.tipo, 'otro');
});

test('avisos de estado (entregado/leído) se ignoran', () => {
  const payload = webhook();
  payload.entry[0].changes[0].value = { messaging_product: 'whatsapp', statuses: [{ id: 'wamid.x', status: 'read' }] };
  assert.deepEqual(parsearWebhook(payload), []);
});

test('payloads ajenos o mal formados → lista vacía', () => {
  for (const p of [null, {}, { object: 'page', entry: [] }, { object: 'whatsapp_business_account' }]) {
    assert.deepEqual(parsearWebhook(p), []);
  }
});

test('el texto se limpia y se corta a 1000 caracteres', () => {
  const [m] = parsearWebhook(webhook({ from: '573114441001', id: 'w', type: 'text', text: { body: `a\u0000b${'x'.repeat(2000)}` } }));
  assert.equal(m.texto.length, 1000);
  assert.ok(m.texto.startsWith('ab'));
});

test('mensaje sin teléfono válido se descarta', () => {
  assert.deepEqual(parsearWebhook(webhook({ from: 'xx', id: 'w', type: 'text', text: { body: 'hola' } })), []);
});
