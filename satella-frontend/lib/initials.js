/** "María Fernanda López" → "MF". Se usa en los avatares del Topbar y el Sidebar. */
export function initials(nombre = '') {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
