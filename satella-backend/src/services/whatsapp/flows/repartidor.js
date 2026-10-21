/**
 * Flujo del repartidor (Usuario con rol Repartidor).
 *
 * Todo exige un PIN vigente: el router manda al paso 'pin' si la
 * verificación no existe o venció (ver requiereVerificacion), incluso a mitad
 * de una acción. Con la sesión verificada: Mi ruta / Confirmar entrega /
 * Reportar problema.
 *
 * Nunca se confía en ids del chat: cada acción vuelve a comprobar en la base
 * que el envío esté asignado a ESTE repartidor (repartidorId = usuario.id).
 */
const prisma = require('../../../lib/prisma');
const pin = require('../pin');
const { limpiarTexto } = require('../../../utils/sanitize');
const alertas = require('../alertas');

const ESTADO_ENVIO = { 'en cola': '🕓 En cola', 'en ruta': '🚚 En ruta', entregado: '✅ Entregado', retraso: '⚠️ Retraso' };
const TIPOS_PROBLEMA = [
  { id: 'prob:cliente_ausente', titulo: 'Cliente ausente' },
  { id: 'prob:direccion_erronea', titulo: 'Dirección errónea' },
  { id: 'prob:producto_danado', titulo: 'Producto dañado' },
  { id: 'prob:otro', titulo: 'Otro problema' },
];
const MAX_DETALLE = 500;

function rangoDeHoy(ahora = new Date()) {
  const desde = new Date(ahora); desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde); hasta.setDate(hasta.getDate() + 1);
  return { gte: desde, lt: hasta };
}

const includeEnvio = { pedido: { include: { cliente: { select: { nombre: true, telefono: true, direccion: true, ciudad: true } } } } };

/** Envíos de hoy asignados a este repartidor, ordenados por ventana horaria. */
function rutaDeHoy(usuarioId) {
  return prisma.envio.findMany({
    where: { repartidorId: usuarioId, fechaProgramada: rangoDeHoy() },
    orderBy: { ventanaHoraria: 'asc' },
    include: includeEnvio,
  });
}

/** Un envío solo si es de este repartidor (si no, null). */
function envioPropio(envioId, usuarioId) {
  return prisma.envio.findFirst({ where: { id: envioId, repartidorId: usuarioId }, include: includeEnvio });
}

/** La dirección del pedido si el cliente pidió otra por WhatsApp; si no, la registrada. */
function direccionEntrega(envio) {
  const otra = /Entregar en: (.+)$/.exec(envio.pedido?.whatsappNotas || '');
  if (otra) return otra[1];
  const c = envio.pedido?.cliente;
  return [c?.direccion, c?.ciudad].filter(Boolean).join(', ') || 'sin dirección';
}

const idDe = (opcion) => Number(opcion.id.split(':').pop());

function filaEnvio(e, prefijo) {
  return {
    id: `${prefijo}:${e.id}`,
    titulo: `#${e.id} · ${e.ventanaHoraria || 'sin hora'}`,
    descripcion: `${e.pedido?.cliente?.nombre || 'Cliente'} — ${direccionEntrega(e)}`,
  };
}

module.exports = {
  nombre: 'repartidor',
  inicio: 'pin',
  /** Paso con el que arranca la conversación: el menú si ya está verificado. */
  pasoInicial: (sesion) => (pin.verificado(sesion) ? 'menu' : 'pin'),
  /** true si el mensaje debe ir primero al PIN (verificación ausente o vencida). */
  requiereVerificacion: (sesion) => sesion.paso !== 'pin' && !pin.verificado(sesion),

  pasos: {
    pin: {
      mostrar: async ({ perfil }) => {
        const sesion = await prisma.sesionChat.findUnique({ where: { telefono: perfil.telefono } });
        const minutos = pin.minutosBloqueo(sesion);
        if (minutos) {
          return { texto: `🔒 Por seguridad, el acceso está bloqueado. Intenta de nuevo en ${minutos} min.`, fin: true };
        }
        return { texto: `Hola ${perfil.usuario.nombre.split(' ')[0]} 🚚\n🔐 Escribe el *PIN de 6 dígitos* que te dieron en el panel de Satella.` };
      },
      recibir: async ({ texto }, { perfil }) => {
        const r = await pin.verificarPin({ usuarioId: perfil.usuario.id, telefono: perfil.telefono, pin: texto });
        if (r.ok) return { decir: ['✅ PIN correcto.'], ir: 'menu' };
        if (r.motivo === 'bloqueado') {
          return { decir: [`🔒 Demasiados intentos fallidos. El acceso queda bloqueado ${r.minutos} min. Pide un PIN nuevo en el panel.`], fin: true };
        }
        if (r.motivo === 'formato') return { error: 'El PIN son 6 números, sin letras ni espacios.' };
        return { error: `PIN incorrecto o vencido. Te ${r.restantes === 1 ? 'queda 1 intento' : `quedan ${r.restantes} intentos`}.` };
      },
    },

    menu: {
      mostrar: () => ({
        texto: '¿Qué necesitas?',
        boton: 'Ver opciones',
        filas: [
          { id: 'rep:ruta', titulo: 'Mi ruta', descripcion: 'Tus envíos de hoy por horario' },
          { id: 'rep:entregar', titulo: 'Confirmar entrega', descripcion: 'Marca un envío como entregado' },
          { id: 'rep:problema', titulo: 'Reportar problema', descripcion: 'Avisa si algo impide una entrega' },
        ],
      }),
      recibir: async ({ opcion }, { perfil }) => {
        if (opcion.id === 'rep:entregar') return { ir: 'elegirEntrega' };
        if (opcion.id === 'rep:problema') return { ir: 'elegirEnvioProblema' };
        const envios = await rutaDeHoy(perfil.usuario.id);
        if (!envios.length) return { decir: ['No tienes envíos asignados para hoy. Escribe *menu* para volver.'], fin: true };
        const lineas = envios.map((e) => [
          `*#${e.id}* · ${e.ventanaHoraria || 'sin hora'} · ${ESTADO_ENVIO[e.estado] || e.estado}`,
          `👤 ${e.pedido?.cliente?.nombre || '—'}${e.pedido?.cliente?.telefono ? ` · 📞 +${e.pedido.cliente.telefono}` : ''}`,
          `📍 ${direccionEntrega(e)}`,
        ].join('\n'));
        return { decir: [`🗺️ *Tu ruta de hoy* (${envios.length} envíos)\n\n${lineas.join('\n\n')}\n\nEscribe *menu* para volver.`], fin: true };
      },
    },

    // ─── Confirmar entrega ──────────────────────────────────────

    elegirEntrega: {
      mostrar: async ({ perfil }) => {
        const enRuta = (await rutaDeHoy(perfil.usuario.id)).filter((e) => e.estado === 'en ruta' || e.estado === 'retraso');
        if (!enRuta.length) return { texto: 'No tienes envíos en ruta para confirmar. Escribe *menu* para volver.', fin: true };
        return { texto: '¿Qué envío entregaste?', boton: 'Ver envíos', filas: enRuta.slice(0, 10).map((e) => filaEnvio(e, 'ent')) };
      },
      recibir: ({ opcion }, { contexto }) => {
        contexto.envioId = idDe(opcion);
        return { ir: 'confirmarEntrega' };
      },
    },

    confirmarEntrega: {
      mostrar: async ({ perfil, contexto }) => {
        const e = await envioPropio(contexto.envioId, perfil.usuario.id);
        if (!e) return { texto: 'Ese envío ya no está asignado a ti. Escribe *menu* para volver.', fin: true };
        return {
          texto: `¿Confirmas que entregaste el envío *#${e.id}* a ${e.pedido?.cliente?.nombre || 'el cliente'}?\n📍 ${direccionEntrega(e)}`,
          botones: [{ id: 'cent:si', titulo: 'Sí, entregado' }, { id: 'cent:no', titulo: 'No, volver' }],
        };
      },
      recibir: async ({ opcion }, { perfil, contexto }) => {
        if (opcion.id === 'cent:no') return { ir: 'menu' };
        // Solo cambia si el envío sigue siendo de este repartidor y no estaba ya entregado.
        const { count } = await prisma.envio.updateMany({
          where: { id: contexto.envioId, repartidorId: perfil.usuario.id, estado: { in: ['en ruta', 'retraso'] } },
          data: { estado: 'entregado' },
        });
        if (!count) return { decir: ['Ese envío ya no está disponible para confirmar.'], ir: 'menu' };
        return { decir: [`✅ Envío #${contexto.envioId} marcado como *entregado*. ¡Buen trabajo!`], ir: 'menu' };
      },
    },

    // ─── Reportar problema ──────────────────────────────────────

    elegirEnvioProblema: {
      mostrar: async ({ perfil }) => {
        const pendientes = (await rutaDeHoy(perfil.usuario.id)).filter((e) => e.estado !== 'entregado');
        if (!pendientes.length) return { texto: 'No tienes envíos pendientes hoy. Escribe *menu* para volver.', fin: true };
        return { texto: '¿Con qué envío tienes el problema?', boton: 'Ver envíos', filas: pendientes.slice(0, 10).map((e) => filaEnvio(e, 'pen')) };
      },
      recibir: ({ opcion }, { contexto }) => {
        contexto.envioId = idDe(opcion);
        return { ir: 'tipoProblema' };
      },
    },

    tipoProblema: {
      mostrar: ({ contexto }) => ({
        texto: `¿Qué pasó con el envío *#${contexto.envioId}*?`,
        boton: 'Elegir problema',
        filas: TIPOS_PROBLEMA,
      }),
      recibir: ({ opcion }, { contexto }) => {
        contexto.tipo = opcion.id.split(':')[1];
        return { ir: 'detalleProblema' };
      },
    },

    detalleProblema: {
      aceptaTexto: true,
      mostrar: () => ({
        texto: 'Si quieres, escribe un detalle (ej. "nadie abre, llamé 2 veces"). Si no, toca *Omitir*.',
        botones: [{ id: 'det:omitir', titulo: 'Omitir' }],
      }),
      recibir: async ({ opcion, texto }, { perfil, contexto }) => {
        const detalle = opcion ? null : limpiarTexto(texto, MAX_DETALLE) || null;
        const envio = await envioPropio(contexto.envioId, perfil.usuario.id);
        if (!envio) return { decir: ['Ese envío ya no está asignado a ti.'], ir: 'menu' };

        const reporte = await prisma.reporteProblema.create({
          data: { envioId: envio.id, usuarioId: perfil.usuario.id, tipo: contexto.tipo, detalle },
        });
        // Todo problema salvo "otro" impide entregar a tiempo: el envío queda en retraso.
        if (contexto.tipo !== 'otro' && envio.estado !== 'entregado') {
          await prisma.envio.update({ where: { id: envio.id }, data: { estado: 'retraso' } });
        }
        await alertas.problemaReportado(reporte, { envio, repartidor: perfil.usuario });
        return { decir: [`📝 Reporte #${reporte.id} registrado. El equipo ya puede verlo en el panel.`], ir: 'menu' };
      },
    },
  },
};
