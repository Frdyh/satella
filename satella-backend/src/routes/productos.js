const { Router } = require('express');
const prisma = require('../lib/prisma');
const sanitize = require('../middleware/sanitize');
const pick = require('../utils/pick');
const { missingFields, isValidNumber } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

const includeRelations = {
  categoria: true,
  proveedor: true,
};

const ALLOWED_FIELDS = [
  'nombre', 'unidad', 'precio', 'stockActual', 'stockMinimo',
  'lote', 'fechaVencimiento', 'categoriaId', 'proveedorId',
];
const REQUIRED_FIELDS = ['nombre', 'unidad', 'precio', 'stockActual', 'stockMinimo', 'categoriaId', 'proveedorId'];
const NUMERIC_FIELDS = ['precio', 'stockActual', 'stockMinimo', 'categoriaId', 'proveedorId'];

router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
});

async function validateProducto(data) {
  const missing = missingFields(data, REQUIRED_FIELDS);
  if (missing.length) return `Faltan campos requeridos: ${missing.join(', ')}`;
  for (const field of NUMERIC_FIELDS) {
    if (!isValidNumber(data[field])) return `Campo numérico inválido: ${field}`;
  }

  const categoria = await prisma.categoria.findUnique({ where: { id: data.categoriaId } });
  if (!categoria) return `Categoría no encontrada: ${data.categoriaId}`;

  const proveedor = await prisma.proveedor.findUnique({ where: { id: data.proveedorId } });
  if (!proveedor) return `Proveedor no encontrado: ${data.proveedorId}`;

  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = {};

    if (req.query.categoriaId) where.categoriaId = Number(req.query.categoriaId);
    if (req.query.proveedorId) where.proveedorId = Number(req.query.proveedorId);
    if (req.query.search) {
      where.nombre = { contains: req.query.search };
    }

    const pagination = getPagination(req.query);
    const productos = await prisma.producto.findMany({
      where,
      include: includeRelations,
      orderBy: { nombre: 'asc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.producto.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(productos);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const producto = await prisma.producto.findUnique({
      where: { id: req.params.id },
      include: includeRelations,
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = sanitize(pick(req.body, ALLOWED_FIELDS), {
      dateFields: ['fechaVencimiento'],
      intFields: NUMERIC_FIELDS,
    });
    const error = await validateProducto(data);
    if (error) return res.status(400).json({ error });
    const producto = await prisma.producto.create({
      data,
      include: includeRelations,
    });
    res.status(201).json(producto);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = sanitize(pick(req.body, ALLOWED_FIELDS), {
      dateFields: ['fechaVencimiento'],
      intFields: NUMERIC_FIELDS,
    });
    const error = await validateProducto(data);
    if (error) return res.status(400).json({ error });
    const producto = await prisma.producto.update({
      where: { id: req.params.id },
      data,
      include: includeRelations,
    });
    res.json(producto);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.producto.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
