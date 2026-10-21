/**
 * PIN temporal de un solo uso para el personal que usa el canal (repartidores).
 *
 * - Lo genera el personal desde el panel: se muestra en claro UNA vez y en la
 *   base solo queda su hash (scrypt, igual que las contraseñas).
 * - Vale 10 minutos y sirve una sola vez. Generar uno nuevo invalida el anterior.
 * - Por teléfono: 3 intentos fallidos → bloqueo de 15 minutos.
 * - Al validarlo, la sesión queda verificada 15 minutos (SesionChat.verificadoHasta).
 */
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { hashPassword, verifyPassword } = require('../../utils/password');

const VIGENCIA_PIN_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 3;
const BLOQUEO_MS = 15 * 60 * 1000;
const VERIFICACION_MS = 15 * 60 * 1000;
const FORMATO_PIN = /^\d{6}$/;

/** Crea un PIN nuevo para el usuario y devuelve { pin, expiraEn }. El PIN no se vuelve a poder leer. */
async function generarPin(usuarioId) {
  const pin = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const ahora = new Date();
  const expiraEn = new Date(ahora.getTime() + VIGENCIA_PIN_MS);
  // Los PIN anteriores sin usar dejan de servir.
  await prisma.pinTemporal.updateMany({
    where: { usuarioId, usadoEn: null, expiraEn: { gt: ahora } },
    data: { expiraEn: ahora },
  });
  await prisma.pinTemporal.create({ data: { usuarioId, hash: hashPassword(pin), expiraEn } });
  return { pin, expiraEn };
}

/** Minutos que faltan para que termine el bloqueo, o 0 si no está bloqueado. */
function minutosBloqueo(sesion, ahora = new Date()) {
  if (!sesion?.bloqueadoHasta) return 0;
  const ms = new Date(sesion.bloqueadoHasta) - ahora;
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

function verificado(sesion, ahora = new Date()) {
  return Boolean(sesion?.verificadoHasta && new Date(sesion.verificadoHasta) > ahora);
}

/**
 * Valida el PIN que escribió el usuario desde `telefono`.
 * Devuelve { ok: true } | { ok: false, motivo: 'formato' | 'bloqueado' | 'incorrecto', restantes?, minutos? }.
 * Un texto que no tiene forma de PIN no cuenta como intento.
 */
async function verificarPin({ usuarioId, telefono, pin }) {
  const ahora = new Date();
  const sesion = await prisma.sesionChat.findUnique({ where: { telefono } });
  const minutos = minutosBloqueo(sesion, ahora);
  if (minutos) return { ok: false, motivo: 'bloqueado', minutos };

  const valor = String(pin || '').replace(/\s/g, '');
  if (!FORMATO_PIN.test(valor)) return { ok: false, motivo: 'formato' };

  const vigentes = await prisma.pinTemporal.findMany({
    where: { usuarioId, usadoEn: null, expiraEn: { gt: ahora } },
    orderBy: { creadoEn: 'desc' },
  });
  const valido = vigentes.find((p) => verifyPassword(valor, p.hash));

  if (valido) {
    // Se marca como usado solo si nadie lo usó antes (evita usarlo dos veces en paralelo).
    const { count } = await prisma.pinTemporal.updateMany({ where: { id: valido.id, usadoEn: null }, data: { usadoEn: ahora } });
    if (count === 1) {
      await prisma.sesionChat.update({
        where: { telefono },
        data: { verificadoHasta: new Date(ahora.getTime() + VERIFICACION_MS), intentosFallidos: 0, bloqueadoHasta: null },
      });
      return { ok: true };
    }
  }

  const intentos = (sesion?.intentosFallidos || 0) + 1;
  if (intentos >= MAX_INTENTOS) {
    await prisma.sesionChat.update({
      where: { telefono },
      data: { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MS), verificadoHasta: null },
    });
    return { ok: false, motivo: 'bloqueado', minutos: BLOQUEO_MS / 60000 };
  }
  await prisma.sesionChat.update({ where: { telefono }, data: { intentosFallidos: intentos } });
  return { ok: false, motivo: 'incorrecto', restantes: MAX_INTENTOS - intentos };
}

module.exports = {
  generarPin, verificarPin, verificado, minutosBloqueo,
  VIGENCIA_PIN_MS, MAX_INTENTOS, BLOQUEO_MS, VERIFICACION_MS,
};
