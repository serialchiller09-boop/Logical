/**
 * Shared teaching tag bus between the I/O sandbox and Ladder lab.
 *
 * Not a PLC protocol — just BOOL/number values keyed by tag name, kept in
 * this browser so flipping a switch on the panel can drive a contact on an
 * open rung (and coil writes can light matching LEDs).
 */

export const TAG_BUS_KEY = 'logical.tag-bus.v1';
export const LINKED_IO_KEY = 'logical.ladder-linked-io.v1';
export const COUPLE_PREF_KEY = 'logical.io-couple.v1';

const listeners = new Set();

function emptyState() {
  return { bits: {}, values: {}, updatedAt: 0 };
}

export function loadTagBus() {
  try {
    const raw = JSON.parse(localStorage.getItem(TAG_BUS_KEY));
    if (!raw || typeof raw !== 'object') return emptyState();
    return {
      bits: raw.bits && typeof raw.bits === 'object' ? { ...raw.bits } : {},
      values: raw.values && typeof raw.values === 'object' ? { ...raw.values } : {},
      updatedAt: Number(raw.updatedAt) || 0
    };
  } catch {
    return emptyState();
  }
}

function persist(state) {
  try {
    localStorage.setItem(TAG_BUS_KEY, JSON.stringify(state));
  } catch { /* storage may be unavailable */ }
}

function emit(state, source) {
  for (const fn of listeners) {
    try { fn(state, source); } catch { /* ignore subscriber errors */ }
  }
}

export function subscribeTagBus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isCouplingEnabled() {
  try {
    const v = localStorage.getItem(COUPLE_PREF_KEY);
    if (v == null) return true;
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

export function setCouplingEnabled(on) {
  try { localStorage.setItem(COUPLE_PREF_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  emit(loadTagBus(), 'pref');
}

export function setBit(tag, value, source = 'ui') {
  if (!tag || !isCouplingEnabled()) return loadTagBus();
  const state = loadTagBus();
  state.bits[tag] = value ? 1 : 0;
  state.updatedAt = Date.now();
  persist(state);
  emit(state, source);
  return state;
}

export function setValue(tag, value, source = 'ui') {
  if (!tag || !isCouplingEnabled()) return loadTagBus();
  const state = loadTagBus();
  const n = Number(value);
  state.values[tag] = Number.isNaN(n) ? 0 : n;
  state.updatedAt = Date.now();
  persist(state);
  emit(state, source);
  return state;
}

/** Bulk publish from ladder scan / sandbox without many events. */
export function publishSnapshot({ bits = {}, values = {} } = {}, source = 'ui') {
  if (!isCouplingEnabled()) return loadTagBus();
  const state = loadTagBus();
  let changed = false;
  for (const [k, v] of Object.entries(bits)) {
    const next = v ? 1 : 0;
    if (state.bits[k] !== next) { state.bits[k] = next; changed = true; }
  }
  for (const [k, v] of Object.entries(values)) {
    const n = Number(v);
    const next = Number.isNaN(n) ? 0 : n;
    if (state.values[k] !== next) { state.values[k] = next; changed = true; }
  }
  if (changed) {
    state.updatedAt = Date.now();
    persist(state);
    emit(state, source);
  }
  return state;
}

export function applyBusToBitsValues(bits, values, bus = loadTagBus()) {
  const nextBits = { ...bits };
  const nextValues = { ...values };
  for (const [k, v] of Object.entries(bus.bits || {})) {
    if (k in nextBits) nextBits[k] = v ? 1 : 0;
  }
  for (const [k, v] of Object.entries(bus.values || {})) {
    if (k in nextValues) nextValues[k] = Number(v) || 0;
  }
  return { bits: nextBits, values: nextValues };
}

/** Remember the last rung I/O list so the sandbox can adopt it. */
export function publishLinkedIo({ entryId, title, io = [] } = {}) {
  const payload = {
    entryId: entryId || null,
    title: title || 'Ladder lab rung',
    io: (io || []).filter((p) => p?.tag).map((p) => ({
      tag: p.tag,
      type: p.type || 'DI',
      addr: p.addr || '',
      role: p.role || '',
      initial: p.initial ?? 0
    })),
    updatedAt: Date.now()
  };
  try { localStorage.setItem(LINKED_IO_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  return payload;
}

export function loadLinkedIo() {
  try {
    const raw = JSON.parse(localStorage.getItem(LINKED_IO_KEY));
    if (!raw || !Array.isArray(raw.io) || !raw.io.length) return null;
    return raw;
  } catch {
    return null;
  }
}

export function clearTagBus() {
  const state = emptyState();
  persist(state);
  emit(state, 'clear');
  return state;
}
