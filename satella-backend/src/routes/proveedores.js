const { Router } = require('express');
const prisma = require('../lib/prisma');
const pick = require('../utils/pick');
const { missingFields } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

const ALLOWED_FIELDS = ['nombre', 'contacto', 'telefono'];
const REQUIRED_FIELDS = ['nombre'];

router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
});

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.search) where.nombre = { contains: req.query.search };

    const pagination = getPagination(req.query);
    const proveedores = await prisma.proveedor.findMany({
      where,
      include: { _count: { select: { productos: true } } },
      orderBy: { nombre: 'asc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.proveedor.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(proveedores);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: req.params.id },
      include: { productos: true },
    });
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const proveedor = await prisma.proveedor.create({ data });
    res.status(201).json(proveedor);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const proveedor = await prisma.proveedor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(proveedor);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.proveedor.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
