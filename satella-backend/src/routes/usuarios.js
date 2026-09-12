const { Router } = require('express');
const prisma = require('../lib/prisma');
const pick = require('../utils/pick');
const { missingFields, isValidEmail } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

const ALLOWED_FIELDS = ['nombre', 'rol', 'email'];
const REQUIRED_FIELDS = ['nombre', 'email'];

router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
});

function validateUsuario(data) {
  const missing = missingFields(data, REQUIRED_FIELDS);
  if (missing.length) return `Faltan campos requeridos: ${missing.join(', ')}`;
  if (!isValidEmail(data.email)) return 'Email inválido';
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = {};
    if (req.query.search) {
      where.OR = [
        { nombre: { contains: req.query.search } },
        { email: { contains: req.query.search } },
      ];
    }

    const pagination = getPagination(req.query);
    const usuarios = await prisma.usuario.findMany({
      where,
      orderBy: { nombre: 'asc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.usuario.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(usuarios);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const error = validateUsuario(data);
    if (error) return res.status(400).json({ error });
    const usuario = await prisma.usuario.create({ data });
    res.status(201).json(usuario);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const error = validateUsuario(data);
    if (error) return res.status(400).json({ error });
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
    });
    res.json(usuario);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
