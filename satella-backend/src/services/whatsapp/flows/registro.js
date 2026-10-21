/**
 * Flujo de registro para un teléfono que no está ni en Usuario ni en Cliente.
 * FASE 3: solo la bienvenida. El registro con consentimiento llega en la fase 4.
 */
module.exports = {
  nombre: 'registro',
  inicio: 'bienvenida',
  pasos: {
    bienvenida: {
      mostrar: () => ({
        texto: '¡Hola! 👋 Bienvenido a Satella. Muy pronto podrás registrarte por aquí para hacer tus pedidos.',
        fin: true,
      }),
    },
  },
};
