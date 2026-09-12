const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
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
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
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

export function getPdfUrl(path) {
  return `${API_BASE}${path}`;
}
