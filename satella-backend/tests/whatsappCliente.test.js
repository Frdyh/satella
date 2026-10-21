process.env.ENABLE_WA_SIMULATOR = 'true';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { clientes, productos, pedidos, sesionesChat, resetUsuarios, startServer, crearChat, textos } = require('./helpers');
const { reiniciarLimites } = require('../src/services/whatsapp/entrada');

let server;
let escribir;
before(async () => { server = await startServer(); escribir = crearChat(server); });
after(() => server.close());
beforeEach(() => { resetUsuarios(); reiniciarLimites(); });

const LAURA = '573114441001';
const op = (opcionId, opcionTexto = opcionId) => ({ opcionId, opcionTexto });
const filas = (m) => m.interactive.action.sections[0].rows;
const botones = (m) => m.interactive.action.buttons.map((b) => b.reply.title);
const paso = () => sesionesChat.find((s) => s.telefono === LAURA).paso;

async function abrirCatalogo() {
  await escribir(LAURA, 'hola');
  const [lista] = await escribir(LAURA, op('menu:pedido', 'Hacer pedido'));
  return lista;
}

// --- Hacer pedido ---

test('el catálogo solo muestra productos con stock, con precio y unidad', async () => {
  const lista = await abrirCatalogo();
  assert.deepEqual(filas(lista).map((r) => r.id), ['prod:1', 'prod:2'], 'orden alfabético (Leche, Queso); el Arequipe (stock 0) no aparece');
  assert.equal(filas(lista)[0].description, '$4.500 · litro');
});

test('pedido completo: producto → cantidad → terminar → dirección → confirmar → pedido pendiente', async () => {
  await abrirCatalogo();
  const [cantidad] = await escribir(LAURA, op('prod:1', 'Leche entera 1L'));
  assert.match(cantidad.interactive.body.text, /Leche entera 1L.*\$4\.500 por litro/);
  assert.deepEqual(filas(cantidad).map((r) => r.title), ['1 litro', '2 litros', '3 litros', 'Otra cantidad']);

  const r1 = await escribir(LAURA, op('cant:2'));
  assert.match(r1[0].text.body, /Agregado: 2 litros de Leche/);
  assert.match(r1[1].interactive.body.text, /2 × Leche entera 1L — \$9\.000/);
  assert.deepEqual(botones(r1[1]), ['Agregar otro', 'Terminar pedido', 'Cancelar pedido']);

  const [dir] = await escribir(LAURA, op('mas:terminar'));
  assert.match(dir.interactive.body.text, /Calle 12 #5-30, Fusagasugá/);

  const [resumen] = await escribir(LAURA, op('dir:misma'));
  assert.match(resumen.interactive.body.text, /Total: \$9\.000/);
  assert.equal(pedidos.length, 0, 'no se guarda nada antes de confirmar');

  const [ok] = textos(await escribir(LAURA, op('res:confirmar')));
  assert.match(ok, /Recibimos tu pedido #1.*pendiente/s);

  const pedido = pedidos[0];
  assert.equal(pedido.clienteId, 1);
  assert.equal(pedido.estado, 'pendiente');
  assert.deepEqual(pedido.items, [{ productoId: 1, cantidad: 2 }]);
  assert.equal(pedido.whatsappNotas, 'Pedido hecho por WhatsApp');
});

test('el stock NO se descuenta al crear el pedido', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1'));
  await escribir(LAURA, op('cant:3'));
  await escribir(LAURA, op('mas:terminar'));
  await escribir(LAURA, op('dir:misma'));
  await escribir(LAURA, op('res:confirmar'));
  assert.equal(productos.find((p) => p.id === 1).stockActual, 50);
});

test('varios productos y la misma referencia dos veces se acumulan', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  await escribir(LAURA, op('mas:otro'));
  await escribir(LAURA, op('prod:2')); await escribir(LAURA, op('cant:2'));
  await escribir(LAURA, op('mas:otro'));
  await escribir(LAURA, op('prod:1'));
  const r = await escribir(LAURA, op('cant:3'));
  assert.match(r[1].interactive.body.text, /4 × Leche entera 1L — \$18\.000\n• 2 × Queso campesino — \$24\.000\n\*Total: \$42\.000/);
});

test('solo se ofrecen cantidades que hay en stock', async () => {
  await abrirCatalogo();
  const [cantidad] = await escribir(LAURA, op('prod:2', 'Queso campesino'));
  assert.deepEqual(filas(cantidad).map((r) => r.title), ['1 libra', '2 libras'], 'stock 2: ni "3" ni "Otra cantidad"');
});

test('no se puede pasar del stock sumando en dos veces', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:2')); await escribir(LAURA, op('cant:2'));
  await escribir(LAURA, op('mas:otro'));
  await escribir(LAURA, op('prod:2'));
  const r = textos(await escribir(LAURA, op('cant:1')));
  assert.match(r[0], /Solo hay 2 libras de Queso campesino y ya tienes 2/);
  assert.equal(paso(), 'cantidad');
});

test('"otra cantidad": acepta un número válido y rechaza texto, cero o más del stock', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1'));
  const [pregunta] = textos(await escribir(LAURA, op('cant:otra', 'Otra cantidad')));
  assert.match(pregunta, /máximo 50/);
  assert.match(textos(await escribir(LAURA, 'muchas'))[0], /solo un número/);
  assert.match(textos(await escribir(LAURA, '0'))[0], /solo un número/);
  assert.match(textos(await escribir(LAURA, '51'))[0], /máximo .* es 50/);
  assert.match(textos(await escribir(LAURA, '12'))[0], /Agregado: 12 litros/);
});

test('un producto que no se ofreció (o sin stock) no se acepta', async () => {
  await abrirCatalogo();
  const r = textos(await escribir(LAURA, op('prod:3', 'Arequipe 250g')));
  assert.match(r[0], /No entendí/);
  assert.equal(paso(), 'producto');
});

test('si el producto se agota entre la lista y la elección, se avisa', async () => {
  await abrirCatalogo();
  productos.find((p) => p.id === 2).stockActual = 0;
  const r = textos(await escribir(LAURA, op('prod:2')));
  assert.match(r[0], /ya no está disponible/);
});

test('otra dirección para este pedido: queda en las notas y NO cambia la del cliente', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  await escribir(LAURA, op('mas:terminar'));
  await escribir(LAURA, op('dir:otra', 'Otra dirección'));
  const [resumen] = await escribir(LAURA, 'Oficina: Carrera 7 #80-10');
  assert.match(resumen.interactive.body.text, /Entrega: Oficina: Carrera 7 #80-10/);
  await escribir(LAURA, op('res:confirmar'));
  assert.equal(pedidos[0].whatsappNotas, 'Pedido hecho por WhatsApp · Entregar en: Oficina: Carrera 7 #80-10');
  assert.equal(clientes[0].direccion, 'Calle 12 #5-30');
});

test('cliente sin dirección registrada: se le pide escrita', async () => {
  clientes[0].direccion = null;
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  const [pregunta] = textos(await escribir(LAURA, op('mas:terminar')));
  assert.match(pregunta, /A qué \*dirección\*/);
  const [resumen] = await escribir(LAURA, 'Calle 1 #2-3');
  assert.match(resumen.interactive.body.text, /Entrega: Calle 1 #2-3/);
});

test('cancelar en el resumen o en "¿agregar más?" no guarda nada', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  assert.match(textos(await escribir(LAURA, op('mas:cancelar')))[0], /cancelé el pedido/);
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  await escribir(LAURA, op('mas:terminar')); await escribir(LAURA, op('dir:misma'));
  assert.match(textos(await escribir(LAURA, op('res:cancelar')))[0], /cancelé el pedido/);
  assert.equal(pedidos.length, 0);
});

test('si un producto del carrito se elimina antes de confirmar, no entra al pedido', async () => {
  await abrirCatalogo();
  await escribir(LAURA, op('prod:1')); await escribir(LAURA, op('cant:1'));
  await escribir(LAURA, op('mas:otro'));
  await escribir(LAURA, op('prod:2')); await escribir(LAURA, op('cant:1'));
  await escribir(LAURA, op('mas:terminar')); await escribir(LAURA, op('dir:misma'));
  productos.splice(productos.findIndex((p) => p.id === 2), 1);
  await escribir(LAURA, op('res:confirmar'));
  assert.deepEqual(pedidos[0].items, [{ productoId: 1, cantidad: 1 }]);
});

test('con más de 10 productos, el catálogo se pagina con "Ver más"', async () => {
  for (let i = 10; i < 22; i++) productos.push({ id: i, nombre: `Producto ${String(i).padStart(2, '0')}`, unidad: 'u', precio: 1000, stockActual: 5 });
  const lista = await abrirCatalogo();
  assert.equal(filas(lista).length, 10);
  assert.equal(filas(lista)[9].id, 'prod:mas');
  const [pagina2] = await escribir(LAURA, op('prod:mas'));
  assert.equal(filas(pagina2).length, 5, '14 productos con stock: 9 en la primera página + 5');
  assert.ok(!filas(pagina2).some((r) => r.id === 'prod:mas'));
});

// --- Mis pedidos ---

test('mis pedidos: muestra los últimos con estado, productos y total', async () => {
  pedidos.push(
    { id: 7, clienteId: 1, fecha: new Date('2026-10-01'), estado: 'confirmado', items: [{ productoId: 1, cantidad: 2 }], envio: { estado: 'en ruta' } },
    { id: 8, clienteId: 1, fecha: new Date('2026-10-05'), estado: 'pendiente', items: [{ productoId: 2, cantidad: 1 }] },
    { id: 9, clienteId: 99, fecha: new Date('2026-10-06'), estado: 'pendiente', items: [] },
  );
  await escribir(LAURA, 'hola');
  const [r] = textos(await escribir(LAURA, op('menu:mis-pedidos')));
  assert.ok(r.indexOf('#8') < r.indexOf('#7'), 'el más reciente primero');
  assert.match(r, /Pedido #7\* .*✅ Confirmado · Envío en camino/);
  assert.match(r, /2 × Leche entera 1L · \$9\.000/);
  assert.match(r, /Pedido #8\* .*⏳ Pendiente/);
  assert.ok(!r.includes('#9'), 'no muestra pedidos de otros clientes');
});

// --- Cambiar dirección ---

test('cambiar dirección pide confirmación explícita antes de guardar', async () => {
  await escribir(LAURA, 'hola');
  const [actual] = textos(await escribir(LAURA, op('menu:direccion')));
  assert.match(actual, /Calle 12 #5-30/);
  const [conf] = await escribir(LAURA, 'Avenida 5 #10-20');
  assert.match(conf.interactive.body.text, /Avenida 5 #10-20/);
  assert.equal(clientes[0].direccion, 'Calle 12 #5-30', 'todavía no cambia');
  assert.match(textos(await escribir(LAURA, op('cdir:si')))[0], /actualizada/);
  assert.equal(clientes[0].direccion, 'Avenida 5 #10-20');
});

test('cambiar dirección: "No, dejarla igual" no modifica nada', async () => {
  await escribir(LAURA, 'hola');
  await escribir(LAURA, op('menu:direccion'));
  await escribir(LAURA, 'Avenida 5 #10-20');
  await escribir(LAURA, op('cdir:no'));
  assert.equal(clientes[0].direccion, 'Calle 12 #5-30');
});

test('la cantidad se expresa en la unidad de venta del producto', () => {
  const { cantidadCon } = require('../src/services/whatsapp/flows/cliente');
  assert.equal(cantidadCon(1, 'unidad'), '1 unidad');
  assert.equal(cantidadCon(3, 'unidad'), '3 unidades');
  assert.equal(cantidadCon(2, 'litro'), '2 litros');
  assert.equal(cantidadCon(2, 'kg'), '2 kg');
  assert.equal(cantidadCon(5, 'ml'), '5 ml');
});
