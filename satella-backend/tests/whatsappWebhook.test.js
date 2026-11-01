// Las variables se fijan antes de cargar la app: la ruta del simulador solo
// se registra si ENABLE_WA_SIMULATOR=true al arrancar.
process.env.WA_APP_SECRET = 'secreto-app-prueba';
process.env.WA_VERIFY_TOKEN = 'token-verificacion-prueba';
process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { usuarios, mensajesProcesados, resetUsuarios, startServer, call, esperar } = require('./helpers');
const { signToken } = require('../src/utils/token');
const { reiniciarLimites, LIMITE_MENSAJES } = require('../src/services/whatsapp/entrada');

let server;
before(async () => { server = await startServer(); });
after(() => server.close());
beforeEach(() => { resetUsuarios(); reiniciarLimites(); });

const api = (...args) => call(server.baseUrl, ...args);
const firmar = (raw, secreto = process.env.WA_APP_SECRET) => `sha256=${crypto.createHmac('sha256', secreto).update(raw).digest('hex')}`;
const webhookTexto = (wamid, texto = 'hola') => JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages: [
    { from: '573114441001', id: wamid, type: 'text', text: { body: texto } },
  ] } }] }],
});

// --- GET: verificación inicial de Meta ---

test('GET webhook con el verify token correcto devuelve el challenge', async () => {
  const { status, body } = await api('GET', '/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=token-verificacion-prueba&hub.challenge=12345');
  assert.equal(status, 200);
  assert.equal(body, 12345);
});

test('GET webhook con token incorrecto → 403', async () => {
  const { status } = await api('GET', '/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1');
  assert.equal(status, 403);
});

// --- POST: firma ---

test('POST webhook sin firma → 401 y no se procesa', async () => {
  const { status } = await api('POST', '/whatsapp/webhook', { raw: webhookTexto('w1') });
  assert.equal(status, 401);
  assert.equal(mensajesProcesados.length, 0);
});

test('POST webhook firmado con otro secreto → 401', async () => {
  const raw = webhookTexto('w1');
  const { status } = await api('POST', '/whatsapp/webhook', { raw, headers: { 'X-Hub-Signature-256': firmar(raw, 'otro') } });
  assert.equal(status, 401);
});

test('POST webhook con cuerpo alterado después de firmar → 401', async () => {
  const firma = firmar(webhookTexto('w1', 'hola'));
  const { status } = await api('POST', '/whatsapp/webhook', { raw: webhookTexto('w1', 'adiós'), headers: { 'X-Hub-Signature-256': firma } });
  assert.equal(status, 401);
});

test('POST webhook bien firmado → 200 y el mensaje se procesa', async () => {
  const raw = webhookTexto('wamid.ok');
  const { status } = await api('POST', '/whatsapp/webhook', { raw, headers: { 'X-Hub-Signature-256': firmar(raw) } });
  assert.equal(status, 200);
  await esperar(() => mensajesProcesados.length === 1);
  assert.equal(mensajesProcesados[0].wamid, 'wamid.ok');
});

test('el webhook no exige sesión del panel (Meta no inicia sesión)', async () => {
  const raw = webhookTexto('wamid.publico');
  const { status } = await api('POST', '/whatsapp/webhook', { raw, headers: { 'X-Hub-Signature-256': firmar(raw) } });
  assert.notEqual(status, 401);
});

// --- Idempotencia ---

test('Meta reintenta el mismo mensaje → llega al router una sola vez', async () => {
  // Se cuenta cuántas veces el router atiende el mensaje (no cuántas se registra).
  const router = require('../src/services/whatsapp/router');
  const original = router.atender;
  const atendidos = [];
  router.atender = async (mensaje) => { atendidos.push(mensaje.wamid); };
  try {
    const raw = webhookTexto('wamid.repetido');
    const headers = { 'X-Hub-Signature-256': firmar(raw) };
    for (let i = 0; i < 3; i++) await api('POST', '/whatsapp/webhook', { raw, headers });
    await esperar(() => atendidos.length >= 1);
    await new Promise((r) => setTimeout(r, 150));
    assert.deepEqual(atendidos, ['wamid.repetido']);
  } finally {
    router.atender = original;
  }
});

// --- Simulador ---

const token = () => signToken(usuarios.find((u) => u.id === 1));

test('simulador exige sesión del personal', async () => {
  const { status } = await api('POST', '/whatsapp/simulador', { body: { telefono: '3114441001', texto: 'hola' } });
  assert.equal(status, 401);
});

test('simulador: recorre el mismo camino que un mensaje real (parser → router → flujo)', async () => {
  const { status, body } = await api('POST', '/whatsapp/simulador', { token: token(), body: { telefono: '311-444-1001', texto: 'hola' } });
  assert.equal(status, 200);
  assert.equal(body.resultado, 'procesado');
  assert.equal(body.respuestas.length, 1);
  assert.equal(body.respuestas[0].to, '573114441001');
  assert.match(body.respuestas[0].interactive.body.text, /Hola Laura/);
});

test('simulador: acepta respuestas de lista o botón', async () => {
  await api('POST', '/whatsapp/simulador', { token: token(), body: { telefono: '3114441001', texto: 'hola' } });
  const { body } = await api('POST', '/whatsapp/simulador', { token: token(), body: { telefono: '3114441001', opcionId: 'menu:pedido', opcionTexto: 'Hacer pedido' } });
  assert.equal(body.resultado, 'procesado');
  assert.match(body.respuestas[0].interactive.body.text, /Qué producto quieres/);
});

test('simulador: repetir el wamid → duplicado, sin respuesta', async () => {
  const b = { telefono: '3114441001', texto: 'hola', wamid: 'sim-fijo' };
  assert.equal((await api('POST', '/whatsapp/simulador', { token: token(), body: b })).body.resultado, 'procesado');
  const { body } = await api('POST', '/whatsapp/simulador', { token: token(), body: b });
  assert.equal(body.resultado, 'duplicado');
  assert.equal(body.respuestas.length, 0);
});

test('simulador: valida teléfono y contenido', async () => {
  assert.equal((await api('POST', '/whatsapp/simulador', { token: token(), body: { telefono: 'abc', texto: 'x' } })).status, 400);
  assert.equal((await api('POST', '/whatsapp/simulador', { token: token(), body: { telefono: '3114441001' } })).status, 400);
});

// --- Límite por teléfono ---

test(`más de ${LIMITE_MENSAJES} mensajes por minuto de un teléfono → limitado, con un solo aviso`, async () => {
  const enviar = (telefono) => api('POST', '/whatsapp/simulador', { token: token(), body: { telefono, texto: 'spam' } });
  for (let i = 0; i < LIMITE_MENSAJES; i++) assert.equal((await enviar('3114441001')).body.resultado, 'procesado');
  const primero = await enviar('3114441001');
  assert.equal(primero.body.resultado, 'limitado');
  assert.match(primero.body.respuestas[0].text.body, /muchos mensajes/);
  const segundo = await enviar('3114441001');
  assert.equal(segundo.body.respuestas.length, 0);
  // Otro teléfono no se ve afectado.
  assert.equal((await enviar('3124441002')).body.resultado, 'procesado');
});
