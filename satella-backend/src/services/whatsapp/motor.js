/**
 * Motor de flujos: ejecuta una máquina de estados definida en flows/*.js.
 *
 * Un flujo es { nombre, inicio, pasos }, y cada paso:
 *   mostrar(estado)          → qué se le envía al llegar al paso:
 *                              { texto } | { texto, botones: [{id, titulo}] }
 *                              | { texto, boton, filas: [{id, titulo, descripcion}] }
 *                              Con fin: true, la conversación termina tras mostrarlo
 *                              (mensajes informativos; el paso no necesita recibir).
 *   recibir(entrada, estado) → qué hacer con la respuesta:
 *                              { ir: 'otroPaso' }           pasa al siguiente paso
 *                              { error: 'texto' }           repite el paso con ese aviso
 *                              { fin: true }                termina la conversación
 *                              { fin: true, olvidar: true } termina y borra la sesión
 *                              y opcionalmente decir: ['texto', …] antes de continuar.
 *
 * `estado` = { perfil, contexto }. El contexto es un objeto que se guarda en
 * SesionChat.contexto entre mensajes (respuestas parciales).
 *
 * Seguridad: las opciones que se muestran se guardan en contexto._opciones y
 * solo se aceptan respuestas que estén en esa lista; un id que llegue del chat
 * y no se haya ofrecido se trata como una entrada inesperada.
 */
const sesiones = require('./sesiones');

// Paso especial: la conversación terminó; el próximo mensaje empieza de nuevo.
const FIN = '_fin';

/** Minúsculas, sin tildes ni espacios sobrantes: "Menú " → "menu". */
function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Busca la opción elegida entre las ofrecidas: por id (botón/lista) o, si la
 * persona escribió, por número ("2") o por el título exacto ("mis pedidos").
 */
function resolverOpcion(mensaje, opciones) {
  if (mensaje.tipo === 'opcion') return opciones.find((o) => o.id === mensaje.opcionId) || null;
  if (mensaje.tipo !== 'texto') return null;
  const t = normalizar(mensaje.texto);
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= opciones.length) return opciones[n - 1];
  return opciones.find((o) => normalizar(o.titulo) === t) || null;
}

async function enviarPrompt(prompt, salida) {
  if (prompt.botones) return salida.botones(prompt.texto, prompt.botones);
  if (prompt.filas) return salida.lista(prompt.texto, prompt.boton || 'Ver opciones', prompt.filas);
  return salida.texto(prompt.texto);
}

/** Muestra un paso y guarda la sesión parada en él. */
async function irA(flujo, paso, estado, salida, telefono) {
  const prompt = await flujo.pasos[paso].mostrar(estado);
  const opciones = prompt.botones || prompt.filas;
  estado.contexto._opciones = opciones ? opciones.map(({ id, titulo }) => ({ id, titulo })) : undefined;
  await enviarPrompt(prompt, salida);
  if (prompt.fin) return sesiones.guardar(telefono, { flujo: flujo.nombre, paso: FIN, contexto: {} });
  await sesiones.guardar(telefono, { flujo: flujo.nombre, paso, contexto: estado.contexto });
}

/** Empieza el flujo desde su primer paso, con un aviso opcional antes. */
async function iniciar(flujo, perfil, salida, { aviso } = {}) {
  if (aviso) await salida.texto(aviso);
  await irA(flujo, flujo.inicio, { perfil, contexto: {} }, salida, perfil.telefono);
}

/** Procesa la respuesta del usuario al paso en el que está su sesión. */
async function continuar(flujo, sesion, mensaje, perfil, salida) {
  const paso = flujo.pasos[sesion.paso];
  if (!paso) return iniciar(flujo, perfil, salida);

  const estado = { perfil, contexto: { ...(sesion.contexto || {}) } };
  const opciones = estado.contexto._opciones;
  const entrada = { mensaje, texto: mensaje.texto, opcion: null };

  if (opciones?.length) {
    entrada.opcion = resolverOpcion(mensaje, opciones);
    if (!entrada.opcion) {
      await salida.texto('No entendí tu respuesta. Elige una de las opciones 👇');
      return irA(flujo, sesion.paso, estado, salida, perfil.telefono);
    }
  } else if (mensaje.tipo !== 'texto' || !mensaje.texto) {
    await salida.texto('Por favor responde escribiendo un mensaje de texto.');
    return irA(flujo, sesion.paso, estado, salida, perfil.telefono);
  }

  const r = await paso.recibir(entrada, estado);
  for (const texto of r.decir || []) await salida.texto(texto);

  if (r.error) {
    await salida.texto(r.error);
    return irA(flujo, sesion.paso, estado, salida, perfil.telefono);
  }
  if (r.fin) {
    if (r.olvidar) return sesiones.borrar(perfil.telefono);
    return sesiones.guardar(perfil.telefono, { flujo: flujo.nombre, paso: FIN, contexto: {} });
  }
  return irA(flujo, r.ir, estado, salida, perfil.telefono);
}

module.exports = { iniciar, continuar, normalizar, resolverOpcion, FIN };
