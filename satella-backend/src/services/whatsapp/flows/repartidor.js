/**
 * Flujo del repartidor (Usuario con rol Repartidor).
 * FASE 3: solo el saludo. El PIN y el menú (Mi ruta / Confirmar entrega /
 * Reportar problema) llegan en la fase 6: hasta entonces no se expone ninguna
 * función, porque todas deben exigir el PIN.
 */
module.exports = {
  nombre: 'repartidor',
  inicio: 'saludo',
  pasos: {
    saludo: {
      mostrar: ({ perfil }) => ({
        texto: `Hola ${perfil.usuario.nombre.split(' ')[0]} 🚚 Muy pronto podrás ver tu ruta y confirmar entregas por aquí.`,
        fin: true,
      }),
    },
  },
};
