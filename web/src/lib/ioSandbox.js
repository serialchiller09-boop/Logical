/**
 * Virtual I/O sandbox — panel model, starter layout, browser persistence.
 *
 * Teaching soft-panel only: local tags in this browser. Not a PLC runtime,
 * not live field I/O. Ladder lab coupling is a later phase.
 */

export const STORAGE_KEY = 'logical.io-sandbox.v1';
export const PANEL_VERSION = 1;

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

export function initialTags(widgets = []) {
  const tags = {};
  for (const w of widgets) {
    if (!w.tag) continue;
    if (w.type === 'pot') tags[w.tag] = 0;
    else tags[w.tag] = false;
  }
  return tags;
}

export function normalizePanel(raw) {
  if (!raw || typeof raw !== 'object') return createStarterPanel();
  const widgets = Array.isArray(raw.widgets)
    ? raw.widgets
      .filter((w) => w && WIDGET_TYPES[w.type] && typeof w.tag === 'string' && w.tag.trim())
      .map((w) => ({
        id: w.id || uid(w.type),
        type: w.type,
        tag: String(w.tag).trim().toUpperCase().replace(/\s+/g, '_'),
        label: String(w.label || w.tag).slice(0, 48),
        color: LED_COLORS.includes(w.color) ? w.color : 'green',
        x: Number.isFinite(w.x) ? w.x : 0,
        y: Number.isFinite(w.y) ? w.y : 0,
        min: w.type === 'pot' ? Number(w.min) || 0 : undefined,
        max: w.type === 'pot' ? (Number(w.max) || 100) : undefined
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
  return {
    version: PANEL_VERSION,
    mode: raw.mode === 'trainer' ? 'trainer' : 'blank',
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
  const resolvedTag = String(overrides.tag || tag).trim().toUpperCase().replace(/\s+/g, '_');
  const widget = {
    id: uid(type),
    type,
    tag: resolvedTag,
    label: String(overrides.label || `${prefix} ${counts}`).slice(0, 48),
    color: type === 'led' ? (LED_COLORS.includes(overrides.color) ? overrides.color : 'green') : undefined,
    min: type === 'pot' ? 0 : undefined,
    max: type === 'pot' ? 100 : undefined,
    x: Number.isFinite(overrides.x) ? overrides.x : slot.x,
    y: Number.isFinite(overrides.y) ? overrides.y : slot.y
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
    if (label != null) next.label = String(label).slice(0, 48);
    if (tag != null && String(tag).trim()) next.tag = String(tag).trim().toUpperCase().replace(/\s+/g, '_');
    if (color && LED_COLORS.includes(color)) next.color = color;
    return next;
  });
  const tags = { ...panel.tags };
  for (const w of widgets) {
    if (!(w.tag in tags)) tags[w.tag] = w.type === 'pot' ? 0 : false;
  }
  return { ...panel, widgets, tags };
}

export function countByType(panel) {
  const out = { led: 0, switch: 0, pb: 0, pot: 0 };
  for (const w of panel.widgets) {
    if (out[w.type] != null) out[w.type] += 1;
  }
  return out;
}
