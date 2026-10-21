const prisma = require('../lib/prisma');
const { normalizarTelefono } = require('../utils/phone');

/**
 * Un mismo teléfono no puede ser a la vez de un Usuario (personal) y de un
 * Cliente: el canal de WhatsApp decide el perfil por el número, así que debe
 * ser inequívoco. Revisa ambas tablas, ignorando el propio registro que se
 * está editando, y devuelve un mensaje de error o null si está libre.
 */
async function conflictoTelefono(telefono, { clienteId, usuarioId } = {}) {
  if (!telefono) return null;
  const [cliente, usuario] = await Promise.all([
    prisma.cliente.findUnique({ where: { telefono }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { telefono }, select: { id: true } }),
  ]);
  if (cliente && cliente.id !== clienteId) return 'Ese teléfono ya está registrado a un cliente';
  if (usuario && usuario.id !== usuarioId) return 'Ese teléfono ya está registrado a un usuario del personal';
  return null;
}

/**
 * Para los controllers de clientes y usuarios: si el body trae `telefono`,
 * lo normaliza en el mismo objeto `data` (vacío → null) y verifica que no
 * esté en uso. Devuelve un mensaje de error o null.
 */
async function prepararTelefono(data, ids = {}) {
  if (!Object.prototype.hasOwnProperty.call(data, 'telefono')) return null;
  const vacio = data.telefono === null || String(data.telefono).trim() === '';
  if (vacio) {
    data.telefono = null;
    return null;
  }
  const telefono = normalizarTelefono(data.telefono);
  if (!telefono) return 'Teléfono inválido: usa un celular de 10 dígitos o un número con indicativo de país';
  data.telefono = telefono;
  return conflictoTelefono(telefono, ids);
}

module.exports = { conflictoTelefono, prepararTelefono };
