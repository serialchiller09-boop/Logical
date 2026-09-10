import { useCallback, useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.DEV ? '' : '';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, { headers: { 'content-type': 'application/json', ...(opts.headers || {}) }, ...opts });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || data?.detail || `HTTP ${res.status}`);
    err.status = res.status; err.payload = data; throw err;
  }
  return data;
}

const qs = (o = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  return p.toString();
};

export const TOKEN_KEY = 'logical.adminToken';
// storage can be unavailable (private mode, SSR, hardened browsers): the admin token simply
// stays in memory for that page load rather than taking the whole app down.
let memoryToken = '';
export function getAdminToken() {
  try { return localStorage.getItem(TOKEN_KEY) ?? memoryToken; } catch { return memoryToken; }
}
export function setAdminToken(t) {
  memoryToken = t || '';
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* in-memory only */ }
}

export const api = {
  health: () => req('/api/health'),
  sections: () => req('/api/sections'),
  stats: () => req('/api/stats'),
  entries: (f) => req(`/api/entries?${qs(f)}`),
  entry: (id) => req(`/api/entries/${encodeURIComponent(id)}`),
  search: (q) => req(`/api/search?${qs({ q })}`),
  decode: (tag) => req(`/api/tag?${qs({ tag })}`),

  state: {
    all: () => req('/api/state'),
    bookmarks: () => req('/api/bookmarks'),
    mark: (id) => req(`/api/bookmarks/${encodeURIComponent(id)}`, { method: 'PUT' }),
    unmark: (id) => req(`/api/bookmarks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    note: (id) => req(`/api/notes/${encodeURIComponent(id)}`),
    saveNote: (id, body) => req(`/api/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ body }) }),
    seen: (id) => req(`/api/recents/${encodeURIComponent(id)}`, { method: 'POST' }),
    clearRecents: () => req('/api/recents', { method: 'DELETE' })
  },

  admin: {
    h: () => ({ 'x-admin-token': getAdminToken() }),
    list: (f) => req(`/api/admin/entries?${qs(f)}`, { headers: api.admin.h() }),
    update: (id, patch) => req(`/api/admin/entries/${encodeURIComponent(id)}`, { method: 'PUT', headers: api.admin.h(), body: JSON.stringify(patch) }),
    create: (body) => req('/api/admin/entries', { method: 'POST', headers: api.admin.h(), body: JSON.stringify(body) }),
    remove: (id) => req(`/api/admin/entries/${encodeURIComponent(id)}`, { method: 'DELETE', headers: api.admin.h() }),
    diff: (id) => req(`/api/admin/diff/${encodeURIComponent(id)}`, { headers: api.admin.h() }),
    revert: (id) => req(`/api/admin/revert/${encodeURIComponent(id)}`, { method: 'POST', headers: api.admin.h() }),
    reseed: (force) => req('/api/admin/reseed', { method: 'POST', headers: api.admin.h(), body: JSON.stringify({ force }) }),
    exportUrl: '/api/admin/export'
  }
};

/** Minimal data hook with abort-on-unmount and manual reload. */
export function useAsync(fn, deps = [], { keep = false } = {}) {
  const [state, setState] = useState({ data: keep ? undefined : null, loading: true, error: null });
  const fref = useRef(fn);
  fref.current = fn;
  const run = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fref.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      setState((s) => ({ data: keep ? s.data : null, loading: false, error: e }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: () => run(true) };
}

export function useDebounced(value, ms = 180) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
