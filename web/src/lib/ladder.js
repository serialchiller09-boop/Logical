/**
 * Ladder engine: analysis + geometry + a small deterministic scan simulator.
 *
 * Simulator scope, stated in the UI too: it evaluates booleans, timers and counters on a
 * virtual scan tick. It does not model I/O delay, task priorities, comm faults, or vendor
 * instruction quirks. Two modes:
 *   analyze(rung, ctx, {live:false})  -> pure, for drawing (no state mutation)
 *   analyze(rung, ctx, {live:true})   -> one scan: updates timers/counters, returns writes
 */

export const GEO = { contactW: 108, coilW: 126, blockW: 186, rowH: 76, gap: 10, branchGap: 20, railPad: 30 };

/** Blocks whose output is a retained state bit rather than the instantaneous rung power. */
const STATE_BLOCKS = new Set(['TON', 'TOF', 'TP', 'RTO', 'CTU', 'CTD', 'CTUD', 'HPA', 'LINT']);

export function collectElements(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (['no', 'nc', 'coil', 'blk', 'short'].includes(node.t)) acc.push(node);
  (node.c || []).forEach((c) => collectElements(c, acc));
  return acc;
}

/** Tags referenced by a rung (addresses + operand tag names). */
export function collectRefs(node, acc = new Set()) {
  for (const el of collectElements(node)) {
    if (el.a && typeof el.a === 'string' && /^[A-Z]/i.test(el.a)) acc.add(el.a);
    for (const p of el.p || []) {
      const v = String(p.v ?? '').trim();
      const m = v.match(/^([A-Z][A-Z0-9_.]{2,})/i);
      if (m && !/^\d/.test(v)) acc.add(m[1]);
    }
  }
  return [...acc];
}

export function param(node, key) { return node?.p?.find((x) => x.k === key)?.v; }

/** Resolve an operand to a number. Accepts: 12, "5 %", "TAG", "TAG + 5", "TAG * 2". */
export function resolveOperand(expr, values) {
  if (expr == null) return null;
  const s = String(expr).replace(/,/g, '').replace(/\s*%$/, '').trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const bin = s.match(/^([A-Za-z][A-Za-z0-9_.]*)\s*([+\-*/])\s*(\d+(\.\d+)?)$/);
  if (bin) {
    const a = values[bin[1]];
    const b = parseFloat(bin[3]);
    if (typeof a !== 'number' || Number.isNaN(a)) return null;
    if (bin[2] === '+') return a + b;
    if (bin[2] === '-') return a - b;
    if (bin[2] === '*') return a * b;
    return b === 0 ? null : a / b;
  }
  const t = s.match(/^([A-Za-z][A-Za-z0-9_.]*)$/);
  if (t && typeof values[t[1]] === 'number') return values[t[1]];
  return null;
}

/** Operand resolution with the whole scan state available: tags, timer/counter members, math. */
export function operandValue(expr, st) {
  const direct = resolveOperand(expr, st.values);
  if (direct != null) return direct;
  const ref = memberRef(String(expr ?? '').trim().replace(/\s*%$/, ''));
  if (ref) {
    const mv = memberValue(st, ref);
    if (mv !== undefined) return mv;
  }
  return null;
}

/** Minimal arithmetic for CPT operands: numbers, tags, + - * / ( ). */
export function evalExpr(expr, values) {
  if (!expr) return null;
  const s = String(expr).replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  const atom = () => {
    if (peek() === '(') { i++; const v = expr_(); if (peek() === ')') i++; return v; }
    const num = /^-?\d+(\.\d+)?/.exec(s.slice(i));
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    const tag = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(s.slice(i));
    if (tag) {
      i += tag[0].length;
      const v = values[tag[0]];
      if (typeof v === 'number') return v;
      throw new Error(`?${tag[0]}`);
    }
    throw new Error('parse');
  };
  const unary = () => { if (peek() === '-') { i++; return -atom(); } return atom(); };
  const mul = () => {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++]; const r = unary();
      if (op === '/' && r === 0) throw new Error('div0');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  function expr_() {
    let v = mul();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = mul(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  try { const out = expr_(); return i >= s.length ? out : null; } catch { return null; }
}

const num = (v, d = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);

/* ------------------------------------------------------------------ element semantics */
function evalLeaf(node, ctx) {
  const { state: st, live } = ctx;
  switch (node.t) {
    case 'short': return true;
    case 'no': return bitOf(st, node.a) === 1;
    case 'nc': return bitOf(st, node.a) === 0;
    case 'coil': return ctx.powered;
    case 'blk': return evalBlock(node, ctx, live);
    default: return false;
  }
}

/** Members of a timer/counter, written either Logix style (T4:0/DN) or dotted (T_LOCK.DN). */
export function memberRef(addr) {
  const m = /^([A-Za-z][A-Za-z0-9_.:]*)\s*[./]\s*(DN|Q|TT|ACC|PRE|CU|CD|CV|V)$/.exec(String(addr ?? '').trim());
  return m ? { base: m[1], member: m[2].toUpperCase() } : null;
}

function memberValue(st, ref) {
  const t = st.timers?.[ref.base] ?? st.counters?.[ref.base];
  if (!t) return undefined;
  switch (ref.member) {
    case 'DN': case 'Q': return t.dn ? 1 : 0;
    case 'TT': return t.running ? 1 : 0;
    case 'ACC': case 'CV': return num(t.acc);
    case 'PRE': case 'V': return num(t.pre ?? t.pv);
    default: return undefined;
  }
}

function bitOf(st, addr) {
  if (!addr) return 0;
  const ref = memberRef(addr);
  if (ref) {
    const mv = memberValue(st, ref);
    if (mv !== undefined) return mv ? 1 : 0;
  }
  if (typeof st.bits[addr] === 'number') return st.bits[addr] ? 1 : 0;
  const v = st.values[addr];
  if (typeof v === 'number') return v ? 1 : 0;
  return 0;
}

function evalBlock(node, ctx, live) {
  const st = ctx.state;
  const k = node.k;
  const enabled = ctx.powered;
  annotatePins(node, st);

  if (['GEQ', 'GRT', 'LES', 'LEQ', 'LT', 'GT', 'EQU', 'NEQ'].includes(k)) {
    const a = operandValue(param(node, 'Src A') ?? param(node, 'A'), st);
    const b = operandValue(param(node, 'Src B') ?? param(node, 'B'), st);
    node._unresolved = a == null || b == null;
    if (node._unresolved) return !!node._manual;
    if (k === 'GEQ') return a >= b; if (k === 'GRT') return a > b;
    if (k === 'LES' || k === 'LT') return a < b; if (k === 'LEQ') return a <= b;
    if (k === 'EQU') return a === b; return a !== b;
  }

  if (['TON', 'TOF', 'RTO'].includes(k)) {
    const key = node.a || node.l;
    const t = (st.timers[key] ??= { acc: 0, dn: false, prevEn: false });
    const preMs = presetMs(node, st.values);
    t.pre = preMs;
    if (live) {
      if (k === 'TON') { t.acc = enabled ? Math.min(preMs || Infinity, t.acc + st.dt) : 0; }
      else if (k === 'TOF') { if (enabled) t.acc = 0; else t.acc = Math.min(preMs || Infinity, t.acc + st.dt); }
      else { if (enabled) t.acc = Math.min(preMs || Infinity, t.acc + st.dt); }
    }
    if (k === 'TON') t.dn = !!enabled && preMs > 0 && t.acc >= preMs;
    else if (k === 'TOF') t.dn = !!enabled || (preMs > 0 && t.acc < preMs);
    else t.dn = preMs > 0 && t.acc >= preMs;
    // TON/RTO count up while enabled; TOF counts up only while the input is FALSE (that is
    // what an off-delay is), and Q is held true for the delay after each falling edge.
    t.running = (k === 'TOF' ? !enabled : enabled) && preMs > 0 && t.acc < preMs;
    node._state = t;
    return t.dn;
  }

  if (k === 'RES') {
    const target = node.a;
    if (live && enabled && target) {
      if (st.timers[target]) Object.assign(st.timers[target], { acc: 0, dn: false, running: false });
      if (st.counters[target]) Object.assign(st.counters[target], { acc: 0, dn: false });
    }
    return !!enabled;
  }

  if (['CTU', 'CTD'].includes(k)) {
    const c = (st.counters[node.a] ??= { acc: 0, dn: false, prevIn: false });
    const pre = num(operandValue(param(node, 'Target') ?? param(node, 'PRE'), st));
    if (live) {
      if (enabled && !c.prevIn) c.acc += k === 'CTU' ? 1 : -1;
      c.prevIn = enabled;
      c.dn = pre > 0 ? (k === 'CTU' ? c.acc >= pre : c.acc <= 0) : false;
    }
    node._state = c;
    return c.dn;
  }

  if (k === 'ONS') {
    const key = node.a || ctx.path;
    const prev = !!st.prevEdges[key];
    const rising = enabled && !prev;
    if (live) st.prevEdges[key] = enabled;
    return rising;
  }

  if (k === 'MOV' || k === 'CPT' || k === 'SEL' || k === 'LIM' || k === 'PID' || k === 'MSG') {
    if (live && enabled) applyDataOp(node, st, ctx);
    return !!enabled;
  }
  return !!enabled;
}

function applyDataOp(node, st, ctx) {
  const dst = param(node, 'DST') || param(node, 'DEST');
  if (!dst) return;
  let v = null;
  if (node.k === 'MOV') v = resolveOperand(param(node, 'SRC'), st.values);
  else if (node.k === 'SEL') v = resolveOperand(bitOf(st, param(node, 'GATE')) ? param(node, 'TRUE') : param(node, 'FALSE'), st.values);
  else if (node.k === 'LIM') {
    const lo = resolveOperand(param(node, 'LO'), st.values);
    const hi = resolveOperand(param(node, 'HI'), st.values);
    const inV = resolveOperand(param(node, 'IN'), st.values);
    if (inV != null) v = Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, inV));
  } else if (node.k === 'CPT') v = evalExpr(param(node, 'EXPR'), st.values);
  else if (node.k === 'PID') {
    const sp = resolveOperand(param(node, 'SP'), st.values);
    const pv = resolveOperand(param(node, 'PV'), st.values);
    const kc = resolveOperand(param(node, 'Kc'), st.values) ?? 1;
    if (sp != null && pv != null) v = clamp(50 + kc * (sp - pv), resolveOperand(param(node, 'MIN'), st.values) ?? 0, resolveOperand(param(node, 'MAX'), st.values) ?? 100);
  }
  if (v != null && !Number.isNaN(v)) {
    st.values[dst] = Math.round(v * 10000) / 10000;
    (ctx.dataWrites ??= []).push({ dst, v: st.values[dst] });
  }
}

/** Show the resolved value next to each authored operand, so the diagram reads like a faceplate. */
function annotatePins(node, st) {
  const store = st.timers?.[node.a] ?? st.counters?.[node.a];
  // PRE means a duration on a timer and a count on a counter: only timers get the time formatting
  const isTimer = ['TON', 'TOF', 'TP', 'RTO', 'TONR', 'TIMER'].includes(String(node.k).toUpperCase());
  for (const p of node.p || []) {
    const key = String(p.k).toUpperCase();
    let out;
    if ((key === 'PRE' || key === 'PT') && isTimer) {
      const ms = presetMs(node, st.values);
      out = ms ? `${Math.round((ms / 1000) * 10) / 10} s = ${ms} ms` : resolveOperand(p.v, st.values) ?? p.v;
    } else if (key === 'ACC' || key === 'ET' || key === 'CU' || key === 'CD' || key === 'CV') {
      out = store ? Math.round(store.acc ?? 0) : resolveOperand(p.v, st.values) ?? p.v;
    } else if (key === 'DN' || key === 'Q' || key === 'V') {
      out = store ? (store.dn ? 'TRUE' : 'false') : resolveOperand(p.v, st.values) ?? p.v;
    } else if (key === 'TT' || key === 'RUN') {
      out = store ? (store.running ? 'TRUE' : 'false') : p.v;
    } else if (key === 'BASE' || key === 'PV') {
      out = store?.pre ?? resolveOperand(p.v, st.values) ?? p.v;
    } else {
      out = resolveOperand(p.v, st.values) ?? p.v;
    }
    p._live = out;
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Preset in ms, accepting "300 s", "120 s", "5 s", "120000" (ms) and "T#5s". */
export function presetMs(node, values) {
  const raw = param(node, 'PRE') ?? param(node, 'PT');
  if (raw == null) return 0;
  const s = String(raw).trim();
  const tIEC = /^T#([\d.]+)(ms|s|m|h)$/i.exec(s);
  if (tIEC) return toMs(parseFloat(tIEC[1]), tIEC[2]);
  const unit = s.match(/^([\d.]+)\s*(ms|s|sec|secs|min|m|h|hr|hours)$/i);
  if (unit) return toMs(parseFloat(unit[1]), unit[2]);
  const n = resolveOperand(s, values ?? {});
  return n == null ? 0 : n; // bare number: platform default is ms
}
function toMs(v, unit) {
  const u = String(unit).toLowerCase();
  if (u === 'ms') return v;
  if (u === 's' || u === 'sec' || u === 'secs') return v * 1000;
  if (u === 'm' || u === 'min') return v * 60000;
  if (u === 'h' || u === 'hr' || u === 'hours') return v * 3600000;
  return v;
}

/* ------------------------------------------------------------------ analyze (single pass, no geometry) */
/**
 * Walks the rung the way a runtime evaluates it: left-to-right, power accumulating through a
 * series chain, each parallel branch fed by the power at the branch point.
 * @returns {{conducts:boolean, map:Map, writes:Array, dataWrites:Array}}
 */
export function analyze(rung, state, opts = {}) {
  const ctx = { state, powered: true, live: !!opts.live, map: new Map(), writes: [], dataWrites: [] };
  const walk = (node, powered, path) => {
    if (!node) return false;
    if (node.t === 'and') {
      let p = powered;
      for (let i = 0; i < (node.c || []).length; i++) p = walk(node.c[i], p, `${path}.${i}`);
      ctx.map.set(node, p);
      return p;
    }
    if (node.t === 'or') {
      let any = false;
      for (let i = 0; i < (node.c || []).length; i++) {
        const r = walk(node.c[i], powered, `${path}.${i}`);
        if (r) any = true;
      }
      ctx.map.set(node, any && powered);
      return any && powered;
    }
    ctx.powered = powered;
    ctx.path = path;
    // A leaf only passes power if the power arriving at it is there to pass. Comparators,
    // timer DN bits and ONS are evaluated locally first (they must update every scan in a
    // real controller), then gated by the incoming rung power.
    const local = evalLeaf(node, ctx);
    // Timers and counters publish a state bit (.DN/.Q) that outlives the power that set it, so
    // their right-hand conduction is that bit, not the power arriving now. Everything else
    // (contacts, comparators, ONS, data moves) only passes power it was actually given.
    const publishesState = node.t === 'coil' || (node.t === 'blk' && STATE_BLOCKS.has(node.k));
    const out = publishesState ? local : (powered && local);
    if (node.t === 'coil' && ctx.live) {
      if (node.k === 'OTE') { state.bits[node.a] = out ? 1 : 0; ctx.writes.push({ addr: node.a, value: out, kind: 'OTE' }); }
      else if (node.k === 'OTL' && out) { state.bits[node.a] = 1; ctx.writes.push({ addr: node.a, value: true, kind: 'OTL' }); }
      else if (node.k === 'OTU' && out) { state.bits[node.a] = 0; ctx.writes.push({ addr: node.a, value: false, kind: 'OTU' }); }
    }
    ctx.map.set(node, out);
    return out;
  };
  const end = walk(rung, true, 'r');
  return { conducts: end, map: ctx.map, writes: ctx.writes, dataWrites: ctx.dataWrites };
}

/* ------------------------------------------------------------------ geometry */
/**
 * Layout with element boxes and wire segments. Elements carry their node identity so the
 * renderer can look up conduction from the analyze() map.
 * @returns {{w:number,h:number,items:Array,wires:Array}}
 */
/** Offset a wire without inventing coordinates it never had (undefined + n would become NaN and leak into the SVG). */
function shiftWire(wr, dx, dy) {
  const out = { ...wr };
  for (const k of ['x1', 'x2', 'x']) if (typeof out[k] === 'number') out[k] += dx;
  for (const k of ['y', 'y1', 'y2']) if (typeof out[k] === 'number') out[k] += dy;
  return out;
}

export function layout(node, map) {
  const cond = (n) => (map && map.size ? !!map.get(n) : undefined);

  const box = (n) => {
    if (!n) return { w: 0, h: GEO.rowH, items: [], wires: [], c: false };
    if (n.t === 'and') {
      const kids = (n.c || []).map(box);
      const gap = kids.length > 1 ? GEO.gap : 0;
      const w = kids.reduce((s, k) => s + k.w, 0) + gap * Math.max(0, kids.length - 1);
      const h = Math.max(GEO.rowH, ...kids.map((k) => k.h));
      const items = [], wires = [];
      let x = 0;
      kids.forEach((k, idx) => {
        const yOff = (h - k.h) / 2;
        k.items.forEach((it) => items.push({ ...it, x: it.x + x, y: it.y + yOff }));
        k.wires.forEach((wr) => wires.push(shiftWire(wr, x, yOff)));
        if (idx > 0) wires.push({ x1: x - gap, x2: x, y: h / 2, c: !!kids[idx - 1].c });
        x += k.w + gap;
      });
      // lead-in and lead-out
      wires.push({ x1: -GEO.railPad, x2: 0, y: h / 2, c: cond(n.c?.[0]) ?? true, edge: 'in' });
      return { w: Math.max(w, 60), h, items, wires, c: cond(n) };
    }
    if (n.t === 'or') {
      const kids = (n.c || []).map(box);
      const innerW = Math.max(...kids.map((k) => k.w), GEO.contactW);
      const h = kids.reduce((s, k) => s + k.h, GEO.branchGap * (kids.length + 1));
      const items = [], wires = [];
      const busL = 0, busR = innerW;
      let y = GEO.branchGap;
      kids.forEach((k) => {
        const midY = y + k.h / 2;
        k.items.forEach((it) => items.push({ ...it, x: it.x + (k.w < innerW ? (innerW - k.w) / 2 : 0), y: it.y + y }));
        k.wires.forEach((wr) => wires.push(shiftWire(wr, 8, y)));
        wires.push({ x1: busL, x2: busL + 8, y: midY, c: true });
        wires.push({ x1: busR - 8, x2: busR, y: midY, c: !!k.c });
        y += k.h + GEO.branchGap;
      });
      wires.push({ vertical: true, x: busL, y1: GEO.branchGap, y2: h - GEO.branchGap, c: true, bus: true });
      wires.push({ vertical: true, x: busR, y1: GEO.branchGap, y2: h - GEO.branchGap, c: kids.some((k) => k.c), bus: true });
      return { w: innerW + 16, h, items, wires, c: cond(n) };
    }
    const size = leafSize(n);
    return { w: size.w, h: size.h, items: [{ node: n, x: 0, y: 0, ...size, c: cond(n) }], wires: [], c: cond(n) };
  };

  const root = box(node);
  return { w: root.w + GEO.railPad * 2 + 16, h: Math.max(root.h, GEO.rowH + 24), items: root.items, wires: root.wires };
}

function leafSize(n) {
  if (n.t === 'coil') return { w: GEO.coilW, h: GEO.rowH };
  if (n.t === 'blk') { const rows = Math.max(1, (n.p || []).length); return { w: GEO.blockW, h: Math.max(GEO.rowH, 30 + rows * 20) }; }
  if (n.t === 'short') return { w: 44, h: GEO.rowH };
  return { w: GEO.contactW, h: GEO.rowH };
}

/* ------------------------------------------------------------------ state helpers */
export function initialState(io = []) {
  const bits = {}, values = {}, timers = {}, counters = {}, prevEdges = {};
  for (const p of io) {
    if (!p?.tag) continue;
    const init = p.initial ?? 0;
    if (['DI', 'DO', 'BIT'].includes(p.type)) bits[p.tag] = init ? 1 : 0;
    else if (p.type === 'TIMER') { timers[p.tag] = { acc: 0, dn: false }; }
    else if (p.type === 'COUNTER') { counters[p.tag] = { acc: Number(init) || 0, dn: false, prevIn: false }; }
    else values[p.tag] = Number(init) || 0;
  }
  return { bits, values, timers, counters, prevEdges, dt: 1000 };
}

export function snapshot(state, rungs) {
  const out = { bits: { ...state.bits }, values: { ...state.values }, timers: {}, counters: {} };
  const els = rungs.flatMap((r) => (r.ladder ? collectElements(r.ladder) : []));
  for (const el of els) {
    if (el.t !== 'blk') continue;
    const key = el.a || el.l;
    if (['TON', 'TOF', 'RTO'].includes(el.k) && state.timers[key]) out.timers[key] = { ...state.timers[key] };
    if (['CTU', 'CTD'].includes(el.k) && state.counters[el.a]) out.counters[el.a] = { ...state.counters[el.a] };
  }
  return out;
}
