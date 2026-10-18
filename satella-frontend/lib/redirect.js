/**
 * Manejo del parámetro ?next= del login: a dónde volver después de iniciar sesión.
 */

/** URL del login que recuerda la página actual (salvo que sea el inicio). */
export function loginUrl() {
  const here = window.location.pathname + window.location.search;
  return here === '/' || here.startsWith('/login') ? '/login' : `/login?next=${encodeURIComponent(here)}`;
}

/**
 * Lee ?next= y lo devuelve solo si es una ruta interna. Rechaza URLs
 * externas ("https://…", "//otro-sitio.com") para que nadie pueda usar
 * el login como redirección abierta hacia una página falsa.
 */
export function nextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) {
    return '/';
  }
  return next;
}
