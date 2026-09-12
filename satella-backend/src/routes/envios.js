const { Router } = require('express');
const prisma = require('../lib/prisma');
const { marcarVerificado } = require('../services/whatsappVerification');
const sanitize = require('../middleware/sanitize');
const pick = require('../utils/pick');
const { missingFields, isValidNumber, isValidEnum } = require('../utils/validate');
const { getPagination } = require('../utils/paginate');

const router = Router();

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

router.param('id', (req, res, next, id) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return res.status(400).json({ error: 'Id inválido' });
  }
  req.params.id = numId;
  next();
});

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
 * GET /api/envios
 * Obtiene una lista de todos los envíos.
 * Permite filtrar por estado y buscar por notas o nombre del cliente.
 */
router.get('/', async (req, res, next) => {
  try {
    // Objeto 'where' dinámico: se construye dependiendo de los query parameters recibidos
    const where = {};

    // Si la URL tiene ?estado=..., agregamos el filtro exacto por estado
    if (req.query.estado) where.estado = req.query.estado;

    // Si la URL tiene ?search=..., buscamos coincidencias parciales (contains)
    if (req.query.search) {
      where.OR = [
        { notas: { contains: req.query.search } }, // Busca en las notas del envío
        { pedido: { cliente: { nombre: { contains: req.query.search } } } }, // Busca en el nombre del cliente asociado
      ];
    }

    // Ejecuta la consulta en la base de datos usando Prisma
    const pagination = getPagination(req.query);
    const envios = await prisma.envio.findMany({
      where, // Aplica los filtros construidos arriba
      include: includeRelations, // Trae los datos relacionados (pedido y cliente)
      orderBy: { fechaProgramada: 'desc' }, // Ordena del más reciente al más antiguo
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
    if (pagination) {
      const total = await prisma.envio.count({ where });
      res.set('X-Total-Count', String(total));
    }
    res.json(envios); // Devuelve los resultados en formato JSON
  } catch (err) { next(err); } // Pasa cualquier error al middleware global de manejo de errores
});

router.get('/:id', async (req, res, next) => {
  try {
    const envio = await prisma.envio.findUnique({
      where: { id: req.params.id },
      include: includeRelations,
    });
    if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
    res.json(envio);
  } catch (err) { next(err); }
});

/**
 * POST /api/envios
 * Crea un nuevo envío en la base de datos.
 */
router.post('/', async (req, res, next) => {
  try {
    // La función 'sanitize' limpia los datos de entrada (req.body) para evitar inyecciones
    // y asegura que los tipos de datos sean correctos antes de enviarlos a Prisma.
    const data = sanitize(pick(req.body, ALLOWED_FIELDS), {
      dateFields: ['fechaProgramada'], // Convierte este campo a un objeto Date válido
      intFields: ['pedidoId'],         // Convierte este campo a un número entero
    });
    if (data.estado === null) delete data.estado;
    const error = await validateEnvio(data);
    if (error) return res.status(400).json({ error });

    // Crea el registro en la tabla 'Envio'
    const envio = await prisma.envio.create({
      data, // Los datos ya limpios
      include: includeRelations, // Devuelve el envío recién creado junto con su pedido y cliente
    });
    res.status(201).json(envio); // 201 Created
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
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
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.envio.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

/**
 * POST /api/envios/:id/verificar
 * Endpoint especial para marcar un envío como verificado vía WhatsApp.
 */
router.post('/:id/verificar', async (req, res, next) => {
  try {
    // Llama a un servicio externo (whatsappVerification.js) que encapsula la lógica
    // de negocio para la verificación. Esto mantiene el controlador limpio.
    const envio = await marcarVerificado(prisma, {
      tipo: 'envio', // Indica que estamos verificando un envío (no un pedido)
      id: req.params.id,
      notas: req.body.notas, // Notas opcionales enviadas en el body
    });
    res.json(envio);
  } catch (err) { next(err); }
});

module.exports = router;
