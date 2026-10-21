/**
 * Flujo del resto del personal con teléfono registrado (operarios).
 * No tienen funciones en el chat: lo importante es que, al escribir, abren
 * su ventana de 24 h y así pueden recibir por aquí los avisos de problemas
 * de los repartidores (fase 7).
 */
module.exports = {
  nombre: 'personal',
  inicio: 'info',
  pasos: {
    info: {
      mostrar: ({ perfil }) => ({
        texto: `Hola ${perfil.usuario.nombre.split(' ')[0]} 👋 Durante las próximas 24 horas te avisaré por aquí si un repartidor reporta un problema. La gestión completa está en el panel de Satella.`,
        fin: true,
      }),
    },
  },
};
