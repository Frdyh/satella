const prisma = require('../lib/prisma');
const { marcarVerificado } = require('../services/whatsappVerification');
const sanitize = require('../utils/sanitize');
const pick = require('../utils/pick');
const { missingFields, isValidNumber, isValidEnum } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const ESTADOS_ENVIO = ['en cola', 'en ruta', 'entregado', 'retraso'];
const VENTANAS_HORARIAS = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'];

/**
 * Objeto de configuración para Prisma que indica qué relaciones (tablas unidas)
 * se deben incluir en las consultas. Aquí pedimos que traiga el 'pedido' asociado
 * y, a su vez, el 'cliente' asociado a ese pedido.
 */
const includeRelations = {
  pedido: { include: { cliente: true } },
};

const ALLOWED_FIELDS = ['fechaProgramada', 'ventanaHoraria', 'estado', 'whatsappVerificado', 'notas', 'pedidoId'];
const REQUIRED_FIELDS = ['fechaProgramada', 'ventanaHoraria', 'pedidoId'];

async function validateEnvio(data) {
  const missing = missingFields(data, REQUIRED_FIELDS);
  if (missing.length) return `Faltan campos requeridos: ${missing.join(', ')}`;
  if (!isValidNumber(data.pedidoId)) return 'Campo numérico inválido: pedidoId';
  if (!isValidEnum(data.estado, ESTADOS_ENVIO)) {
    return `Estado inválido: debe ser uno de ${ESTADOS_ENVIO.join(', ')}`;
  }
  if (!VENTANAS_HORARIAS.includes(data.ventanaHoraria)) {
    return `Ventana horaria inválida: debe ser una de ${VENTANAS_HORARIAS.join(', ')}`;
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: data.pedidoId } });
  if (!pedido) return `Pedido no encontrado: ${data.pedidoId}`;

  return null;
}

/**
 * Obtiene una lista de todos los envíos.
 * Permite filtrar por estado y buscar por notas o nombre del cliente.
 */
async function list(req, res, next) {
  try {
    const where = {};

    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.search) {
      where.OR = [
        { notas: { contains: req.query.search } },
        { pedido: { cliente: { nombre: { contains: req.query.search } } } },
      ];
    }

    const pagination = getPagination(req.query);
    const envios = await prisma.envio.findMany({
      where,
      include: includeRelations,
      orderBy: { fechaProgramada: 'desc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.envio.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(envios);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const envio = await prisma.envio.findUnique({
      where: { id: req.params.id },
      include: includeRelations,
    });
    if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
    res.json(envio);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = sanitize(pick(req.body, ALLOWED_FIELDS), {
      dateFields: ['fechaProgramada'],
      intFields: ['pedidoId'],
    });
    if (data.estado === null) delete data.estado;
    const error = await validateEnvio(data);
    if (error) return res.status(400).json({ error });

    const envio = await prisma.envio.create({
      data,
      include: includeRelations,
    });
    res.status(201).json(envio);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = sanitize(pick(req.body, ALLOWED_FIELDS), {
      dateFields: ['fechaProgramada'],
      intFields: ['pedidoId'],
    });
    // 'estado' no es nulleable en el esquema (tiene default); si no se envía, se omite
    // para que Prisma aplique su valor por defecto en vez de fallar.
    if (data.estado === null) delete data.estado;
    const error = await validateEnvio(data);
    if (error) return res.status(400).json({ error });
    const envio = await prisma.envio.update({
      where: { id: req.params.id },
      data,
      include: includeRelations,
    });
    res.json(envio);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.envio.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}

/**
 * Marca un envío como verificado vía WhatsApp.
 * Llama a un servicio externo (whatsappVerification.js) que encapsula la lógica
 * de negocio para la verificación, manteniendo el controller limpio.
 */
async function verificar(req, res, next) {
  try {
    const envio = await marcarVerificado(prisma, {
      tipo: 'envio',
      id: req.params.id,
      notas: req.body.notas,
    });
    res.json(envio);
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove, verificar };
