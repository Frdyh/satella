const prisma = require('../lib/prisma');
const pick = require('../utils/pick');
const { missingFields, isValidEmail } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');
const { hashPassword } = require('../utils/password');

const ALLOWED_FIELDS = ['nombre', 'rol', 'email', 'password'];
const REQUIRED_FIELDS = ['nombre', 'email'];
const MIN_PASSWORD_LENGTH = 8;

// Campos que se pueden devolver al cliente: nunca incluye passwordHash.
const PUBLIC_SELECT = { id: true, nombre: true, rol: true, email: true };

/**
 * Valida el body y lo transforma al formato de la tabla: normaliza el email
 * y reemplaza `password` (texto plano) por `passwordHash`.
 * En create la contraseña es obligatoria; en update es opcional
 * (si no viene, se conserva la actual).
 */
function buildUsuarioData(body, { requirePassword }) {
  const data = pick(body, ALLOWED_FIELDS);
  const missing = missingFields(data, requirePassword ? [...REQUIRED_FIELDS, 'password'] : REQUIRED_FIELDS);
  if (missing.length) return { error: `Faltan campos requeridos: ${missing.join(', ')}` };
  if (!isValidEmail(data.email)) return { error: 'Email inválido' };
  data.email = data.email.trim().toLowerCase();

  const { password, ...rest } = data;
  if (password === undefined || password === null || password === '') return { data: rest };
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }
  return { data: { ...rest, passwordHash: hashPassword(password) } };
}

async function list(req, res, next) {
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
      select: PUBLIC_SELECT,
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.usuario.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(usuarios);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: PUBLIC_SELECT,
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { data, error } = buildUsuarioData(req.body, { requirePassword: true });
    if (error) return res.status(400).json({ error });
    const usuario = await prisma.usuario.create({ data, select: PUBLIC_SELECT });
    res.status(201).json(usuario);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { data, error } = buildUsuarioData(req.body, { requirePassword: false });
    if (error) return res.status(400).json({ error });
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: PUBLIC_SELECT,
    });
    res.json(usuario);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove, PUBLIC_SELECT };
