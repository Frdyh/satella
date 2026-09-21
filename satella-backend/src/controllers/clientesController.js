const prisma = require('../lib/prisma');
const pick = require('../utils/pick');
const { missingFields } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const ALLOWED_FIELDS = ['nombre', 'telefono', 'direccion', 'ciudad'];
const REQUIRED_FIELDS = ['nombre'];

async function list(req, res, next) {
  try {
    const where = {};
    if (req.query.search) {
      where.nombre = { contains: req.query.search };
    }

    const pagination = getPagination(req.query);
    const clientes = await prisma.cliente.findMany({
      where,
      include: { _count: { select: { pedidos: true } } },
      orderBy: { nombre: 'asc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.cliente.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(clientes);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: { pedidos: true },
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const cliente = await prisma.cliente.create({ data });
    res.status(201).json(cliente);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const cliente = await prisma.cliente.update({
      where: { id: req.params.id },
      data,
    });
    res.json(cliente);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.cliente.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove };
