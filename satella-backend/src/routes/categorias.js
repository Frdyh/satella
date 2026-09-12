const { Router } = require('express');
const prisma = require('../lib/prisma');
const pick = require('../utils/pick');
const { missingFields } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

const ALLOWED_FIELDS = ['nombre', 'descripcion'];
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
    const categorias = await prisma.categoria.findMany({
      where,
      include: { _count: { select: { productos: true } } },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.categoria.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(categorias);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const categoria = await prisma.categoria.findUnique({
      where: { id: req.params.id },
      include: { productos: true },
    });
    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(categoria);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const categoria = await prisma.categoria.create({ data });
    res.status(201).json(categoria);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) {
      return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    }
    const categoria = await prisma.categoria.update({
      where: { id: req.params.id },
      data,
    });
    res.json(categoria);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.categoria.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
