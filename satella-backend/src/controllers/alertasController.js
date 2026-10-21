const prisma = require('../lib/prisma');
const { isValidEnum } = require('../utils/validate');

const ESTADOS = ['abierto', 'atendido'];

const includeRelations = {
  envio: {
    select: {
      id: true, estado: true, ventanaHoraria: true, fechaProgramada: true,
      pedido: { select: { id: true, cliente: { select: { nombre: true, direccion: true, ciudad: true } } } },
    },
  },
  usuario: { select: { id: true, nombre: true } },
  atendidoPor: { select: { id: true, nombre: true } },
};

/**
 * GET /api/alertas?estado=abierto — problemas reportados por los repartidores
 * desde WhatsApp. Sin filtro devuelve los más recientes de cualquier estado.
 */
async function list(req, res, next) {
  try {
    if (!isValidEnum(req.query.estado, ESTADOS) && req.query.estado !== undefined) {
      return res.status(400).json({ error: `Estado inválido: debe ser uno de ${ESTADOS.join(', ')}` });
    }
    const where = req.query.estado ? { estado: req.query.estado } : {};
    const [alertas, abiertas] = await Promise.all([
      prisma.reporteProblema.findMany({ where, orderBy: { creadoEn: 'desc' }, take: 50, include: includeRelations }),
      prisma.reporteProblema.count({ where: { estado: 'abierto' } }),
    ]);
    res.set('X-Total-Count', String(abiertas));
    res.json(alertas);
  } catch (err) { next(err); }
}

/** PUT /api/alertas/:id/atender — marca el problema como atendido por quien lo hace. */
async function atender(req, res, next) {
  try {
    const { count } = await prisma.reporteProblema.updateMany({
      where: { id: req.params.id, estado: 'abierto' },
      data: { estado: 'atendido', atendidoPorId: req.usuario.id },
    });
    if (!count) {
      const existe = await prisma.reporteProblema.findUnique({ where: { id: req.params.id }, select: { id: true } });
      return res.status(existe ? 409 : 404).json({ error: existe ? 'Esta alerta ya estaba atendida' : 'Alerta no encontrada' });
    }
    const alerta = await prisma.reporteProblema.findUnique({ where: { id: req.params.id }, include: includeRelations });
    res.json(alerta);
  } catch (err) { next(err); }
}

module.exports = { list, atender };
