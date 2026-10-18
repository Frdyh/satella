import { loginUrl } from './redirect';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'satella-token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Si la API responde 401 con un token guardado, la sesión expiró o es
 * inválida: se borra y se manda al usuario al login (recordando dónde estaba).
 * Es una recarga completa a propósito: así se descarta todo el estado de la
 * sesión vencida. AppShell no compite con esto porque solo redirige cuando
 * no hay usuario, y la recarga ocurre antes de que eso cambie.
 */
function handleUnauthorized(res) {
  if (res.status === 401 && getToken()) {
    setToken(null);
    if (window.location.pathname !== '/login') window.location.href = loginUrl();
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  });

  if (!res.ok) {
    handleUnauthorized(res);
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * Igual que request(), pero además expone el total real de registros
 * (header X-Total-Count) para listados paginados con ?page=&limit=.
 */
async function requestPaged(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  });

  if (!res.ok) {
    handleUnauthorized(res);
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status}`);
  }

  const data = await res.json();
  const totalHeader = res.headers.get('X-Total-Count');
  const total = totalHeader !== null ? Number(totalHeader) : (Array.isArray(data) ? data.length : 0);
  return { data, total };
}

export const api = {
  get: (path) => request(path),
  getPaged: (path) => requestPaged(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

/**
 * Los PDF se abren en otra pestaña con un <a href>, que no puede mandar
 * headers; por eso el token viaja como ?token= (el backend lo acepta en GET).
 */
export function getPdfUrl(path) {
  const token = getToken();
  if (!token) return `${API_BASE}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${API_BASE}${path}${sep}token=${encodeURIComponent(token)}`;
}
