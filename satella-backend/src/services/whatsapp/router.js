/**
 * Router del canal: decide qué flujo atiende cada mensaje.
 *
 * FASE 2: todavía no hay flujos; responde con un eco para probar el circuito
 * completo (webhook/simulador → parser → entrada → router → sender).
 * En la fase 3 aquí se identifica el perfil por teléfono y se usa SesionChat.
 */
async function atender(mensaje, salida) {
  if (mensaje.tipo === 'texto') {
    await salida.texto(`Recibí tu mensaje: "${mensaje.texto}"`);
  } else if (mensaje.tipo === 'opcion') {
    await salida.texto(`Elegiste la opción "${mensaje.texto}" (${mensaje.opcionId})`);
  } else {
    await salida.texto('Por ahora solo entiendo mensajes de texto y botones.');
  }
}

module.exports = { atender };
