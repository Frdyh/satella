/**
 * Router del canal: identifica quién escribe y despacha al flujo que le toca.
 *
 * El perfil lo decide el sistema por el teléfono, nunca se le pregunta al
 * usuario (requisito de seguridad 6):
 *   1. ¿Es un Usuario del personal?  Repartidor → flujo 'repartidor';
 *                                    otro rol   → flujo 'personal' (operario).
 *   2. ¿Es un Cliente?               → flujo 'cliente'.
 *   3. Si no está en ninguna tabla   → flujo 'registro'.
 *
 * Reglas comunes a todos los flujos:
 *   - "menu" y "cancelar" funcionan siempre y reinician la conversación.
 *   - Una sesión inactiva por más de 30 minutos se reinicia.
 *   - Si cambia el perfil (ej. un número nuevo terminó su registro), se
 *     empieza el flujo del perfil nuevo.
 *   - Un flujo puede exigir verificación (el del repartidor exige PIN): si
 *     no está vigente, el mensaje va primero al paso de verificación.
 */
const prisma = require('../../lib/prisma');
const sesiones = require('./sesiones');
const motor = require('./motor');
const { REPARTIDOR_ROLE } = require('../../middleware/requireRole');

const FLUJOS = {
  registro: require('./flows/registro'),
  cliente: require('./flows/cliente'),
  repartidor: require('./flows/repartidor'),
  personal: require('./flows/personal'),
};

const COMANDOS = { menu: 'menu', cancelar: 'cancelar' };

async function identificar(telefono) {
  const usuario = await prisma.usuario.findUnique({
    where: { telefono },
    select: { id: true, nombre: true, rol: true },
  });
  if (usuario) {
    return { telefono, flujo: usuario.rol === REPARTIDOR_ROLE ? 'repartidor' : 'personal', usuario };
  }
  const cliente = await prisma.cliente.findUnique({
    where: { telefono },
    select: { id: true, nombre: true, direccion: true, ciudad: true },
  });
  if (cliente) return { telefono, flujo: 'cliente', cliente };
  return { telefono, flujo: 'registro' };
}

function comandoGlobal(mensaje) {
  if (mensaje.tipo !== 'texto') return null;
  return COMANDOS[motor.normalizar(mensaje.texto)] || null;
}

async function atender(mensaje, salida) {
  const perfil = await identificar(mensaje.telefono);
  const flujo = FLUJOS[perfil.flujo];
  const sesion = await sesiones.cargar(mensaje.telefono);
  const comando = comandoGlobal(mensaje);

  // Algunos flujos arrancan en un paso u otro según la sesión (repartidor: PIN o menú).
  const paso = flujo.pasoInicial ? flujo.pasoInicial(sesion) : undefined;

  if (!sesion || sesion.flujo !== flujo.nombre || sesion.paso === motor.FIN) {
    return motor.iniciar(flujo, perfil, salida, { paso });
  }
  if (sesiones.inactiva(sesion)) {
    return motor.iniciar(flujo, perfil, salida, {
      aviso: 'Tu conversación anterior se cerró por inactividad. Empecemos de nuevo.',
      paso,
    });
  }
  if (comando === 'cancelar') {
    return motor.iniciar(flujo, perfil, salida, { aviso: 'Listo, cancelé lo que estabas haciendo.', paso });
  }
  if (comando === 'menu') return motor.iniciar(flujo, perfil, salida, { paso });
  if (flujo.requiereVerificacion?.(sesion)) {
    return motor.iniciar(flujo, perfil, salida, {
      aviso: 'Por seguridad, tu verificación venció. Vuelve a escribir un PIN.',
      paso: flujo.inicio,
    });
  }

  return motor.continuar(flujo, sesion, mensaje, perfil, salida);
}

module.exports = { atender, identificar };
