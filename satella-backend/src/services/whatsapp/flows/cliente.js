/**
 * Flujo del cliente antiguo (su teléfono está en Cliente).
 * FASE 3: menú principal. Las opciones se implementan en la fase 5.
 */
const PRONTO = 'Esta opción estará disponible muy pronto. Escribe *menu* para volver al menú.';

module.exports = {
  nombre: 'cliente',
  inicio: 'menu',
  pasos: {
    menu: {
      mostrar: ({ perfil }) => ({
        texto: `Hola ${perfil.cliente.nombre.split(' ')[0]} 👋 ¿Qué quieres hacer hoy?`,
        boton: 'Ver opciones',
        filas: [
          { id: 'menu:pedido', titulo: 'Hacer pedido', descripcion: 'Elige productos del catálogo' },
          { id: 'menu:mis-pedidos', titulo: 'Mis pedidos', descripcion: 'Estado de tus últimos pedidos' },
          { id: 'menu:direccion', titulo: 'Cambiar dirección', descripcion: 'Actualiza tu dirección de entrega' },
        ],
      }),
      recibir: () => ({ decir: [PRONTO], fin: true }),
    },
  },
};
