/**
 * Virtual I/O sandbox — panel model, starter layout, browser persistence.
 *
 * Teaching soft-panel only: local tags in this browser. Not a PLC runtime,
 * not live field I/O. Shared values with Ladder lab go through tagBus.js.
 */

import { TRAINER_IO } from '../data/substationProject.js';

export const STORAGE_KEY = 'logical.io-sandbox.v1';
export const PANEL_VERSION = 1;
export const LAMP_TEST_TAG = 'DI_PB_LampTest';

export const WIDGET_TYPES = {
  led: { label: 'LED', kind: 'output' },
  switch: { label: 'Maintained switch', kind: 'input' },
  pb: { label: 'Momentary PB', kind: 'input' },
  pot: { label: 'Potentiometer', kind: 'input' }
};

export const LED_COLORS = ['green', 'amber', 'red'];

function uid(prefix = 'w') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeTagName(tag) {
  return String(tag || '').trim().replace(/\s+/g, '_');
}

/** Default blank starter: 10 LEDs, 4 toggles, 2 PBs, 2 pots. */
export function createStarterPanel() {
  const widgets = [];
  let col = 0;
  let row = 0;

  const place = (w, span = 1) => {
    widgets.push({ ...w, x: col, y: row });
    col += span;
    if (col >= 10) {
      col = 0;
      row += 1;
    }
  };

  for (let i = 1; i <= 10; i += 1) {
    const color = i <= 8 ? 'green' : 'amber';
    place({
      id: uid('led'),
      type: 'led',
      tag: `LED_${String(i).padStart(2, '0')}`,
      label: `LAMP ${i}`,
      color
    });
  }
  row += 1;
  col = 0;
  for (let i = 1; i <= 4; i += 1) {
    place({
      id: uid('sw'),
      type: 'switch',
      tag: `SW_${String(i).padStart(2, '0')}`,
      label: `SW ${i}`
    }, 2);
  }
  row += 1;
  col = 0;
  for (let i = 1; i <= 2; i += 1) {
    place({
      id: uid('pb'),
      type: 'pb',
      tag: `PB_${String(i).padStart(2, '0')}`,
      label: `PB ${i}`
    }, 2);
  }
  for (let i = 1; i <= 2; i += 1) {
    place({
      id: uid('pot'),
      type: 'pot',
      tag: `POT_${String(i).padStart(2, '0')}`,
      label: `POT ${i}`,
      min: 0,
      max: 100
    }, 3);
  }

  return {
    version: PANEL_VERSION,
    mode: 'blank',
    widgets,
    tags: initialTags(widgets)
  };
}

/** SUB-TRAIN-01 map from the Substation notebook — full maintained/momentary/AI/LED set. */
export function createTrainerPanel() {
  const widgets = [];
  let col = 0;
  let row = 0;
  const place = (w, span = 1) => {
    widgets.push({ ...w, x: col, y: row });
    col += span;
    if (col >= 10) {
      col = 0;
      row += 1;
    }
  };
  const startRow = () => {
    if (col !== 0) {
      col = 0;
      row += 1;
    }
  };

  for (const rowDef of TRAINER_IO.green) {
    place({
      id: uid('led'),
      type: 'led',
      tag: rowDef.tag,
      label: rowDef.device,
      color: 'green',
      channel: rowDef.channel,
      studio: rowDef.studio,
      rslogix: rowDef.rslogix
    });
  }
  for (const rowDef of TRAINER_IO.amber) {
    place({
      id: uid('led'),
      type: 'led',
      tag: rowDef.tag,
      label: rowDef.device,
      color: 'amber',
      channel: rowDef.channel,
      studio: rowDef.studio,
      rslogix: rowDef.rslogix
    });
  }

  startRow();
  row += 1;
  col = 0;
  for (const rowDef of TRAINER_IO.maintained) {
    if (col + 2 > 10) { col = 0; row += 1; }
    place({
      id: uid('sw'),
      type: 'switch',
      tag: rowDef.tag,
      label: rowDef.device,
      channel: rowDef.channel,
      studio: rowDef.studio,
      rslogix: rowDef.rslogix,
      note: rowDef.note,
      normal: rowDef.normal
    }, 2);
  }

  startRow();
  row += 1;
  col = 0;
  for (const rowDef of TRAINER_IO.momentary) {
    if (col + 2 > 10) { col = 0; row += 1; }
    place({
      id: uid('pb'),
      type: 'pb',
      tag: rowDef.tag,
      label: rowDef.device,
      channel: rowDef.channel,
      studio: rowDef.studio,
      rslogix: rowDef.rslogix,
      note: rowDef.action
    }, 2);
  }

  startRow();
  row += 1;
  col = 0;
  for (const rowDef of TRAINER_IO.analog) {
    if (col + 3 > 10) { col = 0; row += 1; }
    place({
      id: uid('pot'),
      type: 'pot',
      tag: rowDef.tag,
      label: rowDef.device,
      channel: rowDef.channel,
      studio: rowDef.studio,
      rslogix: rowDef.rslogix,
      note: rowDef.note,
      engineering: rowDef.engineering,
      min: 0,
      max: 100
    }, 3);
  }

  const tags = initialTags(widgets);
  for (const rowDef of TRAINER_IO.maintained) {
    if (String(rowDef.normal).toUpperCase() === 'ON') tags[rowDef.tag] = true;
  }

  return {
    version: PANEL_VERSION,
    mode: 'trainer',
    widgets,
    tags
  };
}

export function initialTags(widgets = []) {
  const tags = {};
  for (const w of widgets) {
    if (!w.tag) continue;
    if (w.type === 'pot') tags[w.tag] = 0;
    else tags[w.tag] = false;
  }
  return tags;
}

function pickMeta(w) {
  const out = {};
  for (const key of ['channel', 'studio', 'rslogix', 'note', 'engineering', 'normal']) {
    if (w[key] != null && w[key] !== '') out[key] = w[key];
  }
  return out;
}

export function normalizePanel(raw) {
  if (!raw || typeof raw !== 'object') return createStarterPanel();
  const widgets = Array.isArray(raw.widgets)
    ? raw.widgets
      .filter((w) => w && WIDGET_TYPES[w.type] && typeof w.tag === 'string' && w.tag.trim())
      .map((w) => ({
        id: w.id || uid(w.type),
        type: w.type,
        tag: normalizeTagName(w.tag),
        label: String(w.label || w.tag).slice(0, 64),
        color: LED_COLORS.includes(w.color) ? w.color : 'green',
        x: Number.isFinite(w.x) ? w.x : 0,
        y: Number.isFinite(w.y) ? w.y : 0,
        min: w.type === 'pot' ? Number(w.min) || 0 : undefined,
        max: w.type === 'pot' ? (Number(w.max) || 100) : undefined,
        ...pickMeta(w)
      }))
    : [];
  if (!widgets.length) return createStarterPanel();
  const base = initialTags(widgets);
  const tags = { ...base };
  if (raw.tags && typeof raw.tags === 'object') {
    for (const [k, v] of Object.entries(raw.tags)) {
      if (!(k in base)) continue;
      tags[k] = typeof base[k] === 'number' ? Number(v) || 0 : !!v;
    }
  }
  const mode = raw.mode === 'trainer' || raw.mode === 'ladder' ? raw.mode : 'blank';
  return {
    version: PANEL_VERSION,
    mode,
    linkedEntryId: raw.linkedEntryId || null,
    linkedTitle: raw.linkedTitle || null,
    widgets,
    tags
  };
}

export function loadPanel() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizePanel(raw);
  } catch {
    return createStarterPanel();
  }
}

export function savePanel(panel) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: PANEL_VERSION,
      mode: panel.mode || 'blank',
      linkedEntryId: panel.linkedEntryId || null,
      linkedTitle: panel.linkedTitle || null,
      widgets: panel.widgets,
      tags: panel.tags
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearPanelStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function nextFreeSlot(widgets, span = 1) {
  const occupied = new Set(widgets.map((w) => `${w.x},${w.y}`));
  for (let y = 0; y < 40; y += 1) {
    for (let x = 0; x <= 10 - span; x += 1) {
      let free = true;
      for (let i = 0; i < span; i += 1) {
        if (occupied.has(`${x + i},${y}`)) { free = false; break; }
      }
      if (free) return { x, y };
    }
  }
  return { x: 0, y: widgets.length };
}

export function addWidget(panel, type, overrides = {}) {
  const meta = WIDGET_TYPES[type];
  if (!meta) return panel;
  const counts = panel.widgets.filter((w) => w.type === type).length + 1;
  const prefix = type === 'led' ? 'LED' : type === 'switch' ? 'SW' : type === 'pb' ? 'PB' : 'POT';
  const tag = overrides.tag || `${prefix}_${String(counts).padStart(2, '0')}`;
  const span = type === 'pot' ? 3 : type === 'led' ? 1 : 2;
  const slot = nextFreeSlot(panel.widgets, span);
  const resolvedTag = normalizeTagName(overrides.tag || tag);
  const widget = {
    id: uid(type),
    type,
    tag: resolvedTag,
    label: String(overrides.label || `${prefix} ${counts}`).slice(0, 64),
    color: type === 'led' ? (LED_COLORS.includes(overrides.color) ? overrides.color : 'green') : undefined,
    min: type === 'pot' ? 0 : undefined,
    max: type === 'pot' ? 100 : undefined,
    x: Number.isFinite(overrides.x) ? overrides.x : slot.x,
    y: Number.isFinite(overrides.y) ? overrides.y : slot.y,
    ...pickMeta(overrides)
  };
  const widgets = [...panel.widgets, widget];
  const tags = { ...panel.tags };
  if (!(widget.tag in tags)) tags[widget.tag] = type === 'pot' ? 0 : false;
  return { ...panel, widgets, tags };
}

export function removeWidget(panel, id) {
  const widgets = panel.widgets.filter((w) => w.id !== id);
  const used = new Set(widgets.map((w) => w.tag));
  const tags = {};
  for (const [k, v] of Object.entries(panel.tags)) {
    if (used.has(k)) tags[k] = v;
  }
  for (const w of widgets) {
    if (!(w.tag in tags)) tags[w.tag] = w.type === 'pot' ? 0 : false;
  }
  return { ...panel, widgets, tags };
}

export function setTag(panel, tag, value) {
  if (!(tag in panel.tags) && !panel.widgets.some((w) => w.tag === tag)) return panel;
  const sample = panel.widgets.find((w) => w.tag === tag);
  const next = sample?.type === 'pot' ? Number(value) || 0 : !!value;
  return { ...panel, tags: { ...panel.tags, [tag]: next } };
}

export function lampTest(panel, on = true) {
  const tags = { ...panel.tags };
  for (const w of panel.widgets) {
    if (w.type === 'led') tags[w.tag] = !!on;
  }
  return { ...panel, tags };
}

export function moveWidget(panel, id, dx, dy) {
  const widgets = panel.widgets.map((w) => {
    if (w.id !== id) return w;
    return {
      ...w,
      x: Math.max(0, Math.min(9, (w.x || 0) + dx)),
      y: Math.max(0, (w.y || 0) + dy)
    };
  });
  return { ...panel, widgets };
}

export function renameWidget(panel, id, { label, tag, color } = {}) {
  const widgets = panel.widgets.map((w) => {
    if (w.id !== id) return w;
    const next = { ...w };
    if (label != null) next.label = String(label).slice(0, 64);
    if (tag != null && String(tag).trim()) next.tag = normalizeTagName(tag);
    if (color && LED_COLORS.includes(color)) next.color = color;
    return next;
  });
  const tags = { ...panel.tags };
  for (const w of widgets) {
    if (!(w.tag in tags)) tags[w.tag] = w.type === 'pot' ? 0 : false;
  }
  return { ...panel, widgets, tags };
}

/** Export panel map as CSV (channel, tag, addresses, device). */
export function panelToCsv(panel) {
  const columns = ['type', 'channel', 'tag', 'studio', 'rslogix', 'label', 'color', 'normal', 'note'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.join(',')];
  for (const w of panel.widgets) {
    lines.push([
      w.type, w.channel, w.tag, w.studio, w.rslogix, w.label, w.color || '', w.normal || '', w.note || ''
    ].map(esc).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** Flatten main + follow-on rung I/O lists (unique by tag). */
export function collectIoFromPayload(payload) {
  const io = [];
  const seen = new Set();
  const add = (list) => {
    for (const p of list || []) {
      if (!p?.tag || seen.has(p.tag)) continue;
      seen.add(p.tag);
      io.push(p);
    }
  };
  add(payload?.io);
  for (const [k, v] of Object.entries(payload || {})) {
    if (k === 'ladder' || k === 'io' || !v || typeof v !== 'object') continue;
    if (v.ladder) add(v.io);
  }
  return io;
}

export function classifyLadderPoint(point) {
  const type = String(point.type || '').toUpperCase();
  const role = String(point.role || '').toLowerCase();
  const tag = String(point.tag || '');
  if (['AI', 'AO', 'INT', 'DINT', 'REAL', 'FLOAT'].includes(type) || /level|pct|analog|raw|current|voltage/i.test(role)) {
    return { kind: 'pot', color: undefined };
  }
  if (['DO', 'BIT'].includes(type) || /^DO_|^LED_|_LAT$|_RUN$|_DONE$/i.test(tag)) {
    const amber = /trip|alarm|lock|fault|warn|bypass/i.test(`${role} ${tag}`);
    return { kind: 'led', color: amber ? 'amber' : 'green' };
  }
  if (/momentary|push.?button|\bpb\b|start request|ack|acknowledge|reset/i.test(role) || /_PB_|HMI_START|ACK_/i.test(tag)) {
    return { kind: 'pb', color: undefined };
  }
  return { kind: 'switch', color: undefined };
}

/** Build a panel from a Ladder lab linked I/O list (DI/DO/AI…). */
export function createPanelFromLadderIo(linked) {
  const io = linked?.io || [];
  const widgets = [];
  let col = 0;
  let row = 0;
  const place = (w, span = 1) => {
    if (col + span > 10) { col = 0; row += 1; }
    widgets.push({ ...w, x: col, y: row });
    col += span;
    if (col >= 10) { col = 0; row += 1; }
  };

  const leds = [];
  const inputs = [];
  const pots = [];
  for (const point of io) {
    if (!point?.tag) continue;
    const cls = classifyLadderPoint(point);
    const base = {
      id: uid(cls.kind),
      tag: normalizeTagName(point.tag),
      label: String(point.role || point.tag).slice(0, 64),
      channel: point.addr || undefined,
      studio: point.addr || undefined,
      note: point.role || undefined,
      color: cls.color,
      min: cls.kind === 'pot' ? 0 : undefined,
      max: cls.kind === 'pot' ? 100 : undefined,
      type: cls.kind
    };
    if (cls.kind === 'led') leds.push(base);
    else if (cls.kind === 'pot') pots.push(base);
    else inputs.push(base);
  }

  for (const w of leds) place(w, 1);
  if (leds.length) { col = 0; row += 1; }
  for (const w of inputs) place(w, 2);
  if (inputs.length) { col = 0; row += 1; }
  for (const w of pots) place(w, 3);

  if (!widgets.length) return createStarterPanel();

  const tags = initialTags(widgets);
  for (const point of io) {
    const tag = normalizeTagName(point.tag);
    if (!(tag in tags)) continue;
    const cls = classifyLadderPoint(point);
    if (cls.kind === 'pot') tags[tag] = Number(point.initial) || 0;
    else tags[tag] = point.initial ? true : false;
  }

  return {
    version: PANEL_VERSION,
    mode: 'ladder',
    linkedEntryId: linked?.entryId || null,
    linkedTitle: linked?.title || 'Ladder lab',
    widgets,
    tags
  };
}

/** Overlay shared bus values onto panel tags that exist on the plate. */
export function applyBusToPanel(panel, bus) {
  if (!panel || !bus) return panel;
  const tags = { ...panel.tags };
  let changed = false;
  for (const w of panel.widgets) {
    if (w.type === 'pot') {
      if (w.tag in (bus.values || {})) {
        const n = Number(bus.values[w.tag]) || 0;
        if (tags[w.tag] !== n) { tags[w.tag] = n; changed = true; }
      }
    } else if (w.tag in (bus.bits || {})) {
      const on = !!bus.bits[w.tag];
      if (tags[w.tag] !== on) { tags[w.tag] = on; changed = true; }
    }
  }
  return changed ? { ...panel, tags } : panel;
}

/** Flatten panel tags into a bus snapshot. */
export function panelToBusSnapshot(panel) {
  const bits = {};
  const values = {};
  for (const w of panel.widgets || []) {
    if (w.type === 'pot') values[w.tag] = Number(panel.tags[w.tag]) || 0;
    else bits[w.tag] = panel.tags[w.tag] ? 1 : 0;
  }
  return { bits, values };
}

export function countByType(panel) {
  const out = { led: 0, switch: 0, pb: 0, pot: 0 };
  for (const w of panel.widgets) {
    if (out[w.type] != null) out[w.type] += 1;
  }
  return out;
}
