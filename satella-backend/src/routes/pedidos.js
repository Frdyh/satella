const { Router } = require('express');
const prisma = require('../lib/prisma');
const sanitize = require('../middleware/sanitize');
const pick = require('../utils/pick');
const { missingFields, isValidNumber, isValidEnum } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'cancelado'];

/**
 * Configuración para incluir relaciones al consultar pedidos.
 * Trae el cliente, los items del pedido (y el producto de cada item), y el envío asociado.
 */
const includeRelations = {
  cliente: true,
  items: { include: { producto: true } },
  envio: true,
};

const ALLOWED_FIELDS = ['estado', 'whatsappVerificado', 'whatsappNotas', 'clienteId'];
const ALLOWED_ITEM_FIELDS = ['cantidad', 'productoId'];
const REQUIRED_FIELDS = ['clienteId'];

router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
});

async function validatePedido(data, items) {
  const missing = missingFields(data, REQUIRED_FIELDS);
  if (missing.length) return `Faltan campos requeridos: ${missing.join(', ')}`;
  if (!isValidNumber(data.clienteId)) return 'Campo numérico inválido: clienteId';
  if (!isValidEnum(data.estado, ESTADOS_PEDIDO)) {
    return `Estado inválido: debe ser uno de ${ESTADOS_PEDIDO.join(', ')}`;
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) return `Cliente no encontrado: ${data.clienteId}`;

  if (items) {
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const productoId = Number(item.productoId);
      if (!isValidNumber(cantidad) || cantidad <= 0) return 'Cantidad inválida en un item del pedido';
      if (!isValidNumber(productoId) || productoId <= 0) return 'productoId inválido en un item del pedido';

      const producto = await prisma.producto.findUnique({ where: { id: productoId } });
      if (!producto) return `Producto no encontrado: ${productoId}`;
    }
  }
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = {};

    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.search) {
      where.OR = [
        { cliente: { nombre: { contains: req.query.search } } },
      ];
    }

    const pagination = getPagination(req.query);
    const pedidos = await prisma.pedido.findMany({
      where,
      include: includeRelations,
      orderBy: { fecha: 'desc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.pedido.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(pedidos);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: req.params.id },
      include: includeRelations,
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (err) { next(err); }
});

/**
 * POST /api/pedidos
 * Crea un nuevo pedido y, opcionalmente, sus items asociados en una sola transacción.
 */
router.post('/', async (req, res, next) => {
  try {
    // Extrae 'items' del cuerpo de la petición y guarda el resto en 'pedidoData'
    // Esto es desestructuración de objetos en JavaScript.
    const { items, ...pedidoData } = req.body;

    // Limpia los datos del pedido (asegura que clienteId sea un número)
    const data = sanitize(pick(pedidoData, ALLOWED_FIELDS), { intFields: ['clienteId'] });
    // 'estado' no es nulleable en el esquema (tiene default); si no se envía, se omite
    // para que Prisma aplique su valor por defecto en vez de fallar.
    if (data.estado === null) delete data.estado;
    const error = await validatePedido(data, items);
    if (error) return res.status(400).json({ error });

    // Prisma permite "Nested Writes" (escrituras anidadas).
    // Esto crea el Pedido y los PedidoItems al mismo tiempo, de forma transaccional.
    const pedido = await prisma.pedido.create({
      data: {
        ...data,
        // Si vienen 'items' en el body, le decimos a Prisma que los cree asociados a este pedido
        items: items ? { create: items.map((item) => pick(item, ALLOWED_ITEM_FIELDS)) } : undefined,
      },
      include: includeRelations, // Devuelve el pedido completo con sus relaciones
    });
    res.status(201).json(pedido);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { items, ...pedidoData } = req.body;
    const data = sanitize(pick(pedidoData, ALLOWED_FIELDS), { intFields: ['clienteId'] });
    // 'estado' no es nulleable en el esquema (tiene default); si no se envía, se omite
    // para que Prisma aplique su valor por defecto en vez de fallar.
    if (data.estado === null) delete data.estado;
    const error = await validatePedido(data, items);
    if (error) return res.status(400).json({ error });
    const pedido = await prisma.pedido.update({
      where: { id: req.params.id },
      data,
      include: includeRelations,
    });
    res.json(pedido);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.pedido.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
