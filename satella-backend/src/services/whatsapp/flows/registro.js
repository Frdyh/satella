/**
 * Flujo de registro para un teléfono que no está ni en Usuario ni en Cliente.
 *
 * Bienvenida + consentimiento → nombre → dirección → ciudad → resumen →
 * crea Cliente y ConsentimientoDatos en una sola transacción.
 *
 * Ley 1581 de 2012 (protección de datos personales): antes de pedir cualquier
 * dato se informa quién es el responsable, para qué se usarán y los derechos
 * del titular, y se pide aceptación explícita. La evidencia (teléfono, versión
 * del texto, fecha y wamid del mensaje con que aceptó) queda en
 * ConsentimientoDatos. Si no acepta, no se guarda nada y se borra la sesión.
 */
const prisma = require('../../../lib/prisma');
const { conflictoTelefono } = require('../../telefonos');

// Si cambia el texto, cambia la versión: así se sabe qué aceptó cada persona.
const CONSENTIMIENTO_VERSION = 'v1-2026-10';
const CONSENTIMIENTO_TEXTO = [
  '¡Hola! 👋 Te damos la bienvenida a *Satella*. Para registrarte y hacer pedidos por aquí necesitamos tu autorización.',
  '',
  '🔒 *Tratamiento de datos personales (Ley 1581 de 2012)*',
  'Satella, como responsable, usará tu nombre, teléfono, dirección y ciudad solo para gestionar tus pedidos y entregas, y comunicarnos contigo sobre ellos. No los compartimos con terceros.',
  'Puedes conocer, actualizar, rectificar o pedir que eliminemos tus datos en cualquier momento escribiéndonos por este chat.',
  '',
  '¿Aceptas el tratamiento de tus datos?',
].join('\n');

const LIMITES = { nombre: 150, direccion: 255, ciudad: 100 };

function validarCampo(texto, { min, max, nombreCampo }) {
  const valor = String(texto || '').trim();
  if (valor.length < min) return { error: `Ese ${nombreCampo} es muy corto. Intenta de nuevo.` };
  if (valor.length > max) return { error: `Ese ${nombreCampo} es muy largo (máximo ${max} caracteres).` };
  return { valor };
}

function resumen(c) {
  return [
    'Revisa tus datos:',
    '',
    `👤 *Nombre:* ${c.nombre}`,
    `📍 *Dirección:* ${c.direccion}`,
    `🏙️ *Ciudad:* ${c.ciudad}`,
    '',
    '¿Están correctos?',
  ].join('\n');
}

async function crearCliente(telefono, c) {
  // Puede que el número se haya registrado mientras tanto (por el panel, o
  // como usuario del personal): en ese caso no se crea un duplicado.
  if (await conflictoTelefono(telefono)) return null;
  try {
    return await registrarEnTransaccion(telefono, c);
  } catch (err) {
    // Dos mensajes casi simultáneos: el índice único de telefono frena el segundo.
    if (err.code === 'P2002') return null;
    throw err;
  }
}

function registrarEnTransaccion(telefono, c) {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: { nombre: c.nombre, direccion: c.direccion, ciudad: c.ciudad, telefono },
    });
    await tx.consentimientoDatos.create({
      data: {
        telefono,
        clienteId: cliente.id,
        textoVersion: c.consentimiento.version,
        aceptadoEn: new Date(c.consentimiento.aceptadoEn),
        wamid: c.consentimiento.wamid,
      },
    });
    return cliente;
  });
}

module.exports = {
  nombre: 'registro',
  inicio: 'consentimiento',
  CONSENTIMIENTO_VERSION,
  pasos: {
    consentimiento: {
      mostrar: () => ({
        texto: CONSENTIMIENTO_TEXTO,
        botones: [{ id: 'consent:si', titulo: 'Acepto' }, { id: 'consent:no', titulo: 'No acepto' }],
      }),
      recibir: ({ opcion, mensaje }, { contexto }) => {
        if (opcion.id === 'consent:no') {
          return {
            decir: ['Entendido. No guardamos ningún dato tuyo. Si cambias de opinión, escríbenos cuando quieras. 👋'],
            fin: true,
            olvidar: true,
          };
        }
        contexto.consentimiento = {
          version: CONSENTIMIENTO_VERSION,
          aceptadoEn: new Date().toISOString(),
          wamid: mensaje.wamid,
        };
        return { decir: ['¡Gracias! 🙌'], ir: 'nombre' };
      },
    },

    nombre: {
      mostrar: () => ({ texto: '¿Cuál es tu *nombre completo*?' }),
      recibir: ({ texto }, { contexto }) => {
        const r = validarCampo(texto, { min: 3, max: LIMITES.nombre, nombreCampo: 'nombre' });
        if (r.error) return r;
        contexto.nombre = r.valor;
        return { ir: contexto.corrigiendo ? 'confirmar' : 'direccion' };
      },
    },

    direccion: {
      mostrar: () => ({ texto: '¿Cuál es tu *dirección* de entrega? (ej. Calle 12 #5-30, apto 201)' }),
      recibir: ({ texto }, { contexto }) => {
        const r = validarCampo(texto, { min: 5, max: LIMITES.direccion, nombreCampo: 'dirección' });
        if (r.error) return r;
        contexto.direccion = r.valor;
        return { ir: contexto.corrigiendo ? 'confirmar' : 'ciudad' };
      },
    },

    ciudad: {
      mostrar: () => ({ texto: '¿En qué *ciudad* o municipio estás?' }),
      recibir: ({ texto }, { contexto }) => {
        const r = validarCampo(texto, { min: 2, max: LIMITES.ciudad, nombreCampo: 'nombre de ciudad' });
        if (r.error) return r;
        contexto.ciudad = r.valor;
        return { ir: 'confirmar' };
      },
    },

    confirmar: {
      mostrar: ({ contexto }) => ({
        texto: resumen(contexto),
        botones: [
          { id: 'reg:confirmar', titulo: 'Sí, registrarme' },
          { id: 'reg:corregir', titulo: 'Corregir' },
        ],
      }),
      recibir: async ({ opcion }, { perfil, contexto }) => {
        if (opcion.id === 'reg:corregir') return { ir: 'corregir' };
        const cliente = await crearCliente(perfil.telefono, contexto);
        if (!cliente) {
          return { decir: ['Este número ya quedó registrado. Escribe *menu* para continuar.'], fin: true };
        }
        return {
          decir: [`¡Listo, ${cliente.nombre.split(' ')[0]}! 🎉 Tu registro quedó completo. Escribe *menu* para hacer tu primer pedido.`],
          fin: true,
        };
      },
    },

    corregir: {
      mostrar: () => ({
        texto: '¿Qué dato quieres corregir?',
        botones: [
          { id: 'corr:nombre', titulo: 'Nombre' },
          { id: 'corr:direccion', titulo: 'Dirección' },
          { id: 'corr:ciudad', titulo: 'Ciudad' },
        ],
      }),
      recibir: ({ opcion }, { contexto }) => {
        // Al corregir un dato se vuelve directo al resumen, sin repetir los demás.
        contexto.corrigiendo = true;
        return { ir: opcion.id.split(':')[1] };
      },
    },
  },
};
