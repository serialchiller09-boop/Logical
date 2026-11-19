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

/**
 * Narrower boxes for the learner editor. A seal-in (branch, contact, coil, both rails)
 * stays narrow enough that scaling it into a 375px canvas keeps the tag name at least
 * LADDER_MIN_TAG_FONT_PX. The lab keeps GEO.
 */
export const EDITOR_GEO = { contactW: 78, coilW: 90, blockW: 168, rowH: GEO.rowH, gap: 8, branchGap: 18, railPad: 16 };

/** Address text size in .ld-addr. On a narrow canvas fitRung will not scale a rung below the minimum. */
export const LADDER_TAG_FONT_PX = 12.5;
/** 12 CSS px keeps the tag name readable on a phone. The designed size is 12.5px, so this floor barely shrinks a rung that already fits. */
export const LADDER_MIN_TAG_FONT_PX = 12;
/** Below this canvas width, a rung that would shrink tags under the floor scrolls instead. Wider canvases keep the old fit-to-width scale. */
export const LADDER_NARROW_PX = 640;

/** Keep block pin values inside the box so long placeholders cannot cover contacts. */
export function fitPinText(raw, maxChars = 16) {
  const s = String(raw ?? '');
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(1, maxChars - 1))}…`;
}

/**
 * Blocks that publish a state bit (.DN / .Q) as their *local* evaluation result for drawing,
 * but must NOT redefine Logix rung-condition-out. Logix TON/TOF/RTO/CTU/CTD set
 * rung-condition-out = rung-condition-in (1756-RM003T-EN-P, November 2018:
 * TON p. 132, TOF p. 122, RTO p. 112, CTU p. 100, CTD p. 94).
 * Only non-Logix / IEC-style blocks (TP, CTUD)
 * and custom helpers keep "state bit as conduction" semantics here.
 */
const STATE_BLOCKS = new Set(['TP', 'CTUD', 'HPA', 'LINT']);
/** Logix timer/counter instructions: RCO mirrors RCI; status lives in .EN/.TT/.DN/.CU/.CD. */
const LOGIX_PASS_THROUGH = new Set(['TON', 'TOF', 'RTO', 'CTU', 'CTD']);

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
  const m = /^([A-Za-z][A-Za-z0-9_.:]*)\s*[./]\s*(DN|Q|TT|EN|ACC|PRE|CU|CD|CV|V)$/.exec(String(addr ?? '').trim());
  return m ? { base: m[1], member: m[2].toUpperCase() } : null;
}

function memberValue(st, ref) {
  const t = st.timers?.[ref.base] ?? st.counters?.[ref.base];
  if (!t) return undefined;
  switch (ref.member) {
    case 'DN': case 'Q': return t.dn ? 1 : 0;
    case 'TT': return t.running ? 1 : 0;
    case 'EN': return t.en ? 1 : 0;
    case 'CU': return t.cu ? 1 : 0;
    case 'CD': return t.cd ? 1 : 0;
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
    if (k === 'GEQ') return a >= b;
    if (k === 'GRT' || k === 'GT') return a > b;
    if (k === 'LES' || k === 'LT') return a < b;
    if (k === 'LEQ') return a <= b;
    if (k === 'EQU') return a === b;
    if (k === 'NEQ') return a !== b;
    return false;
  }

  if (['TON', 'TOF', 'RTO'].includes(k)) {
    const key = node.a || node.l;
    const t = (st.timers[key] ??= { acc: 0, dn: false, running: false, en: false, prevEn: false });
    t.instr = k;
    const preMs = presetMs(node, st.values);
    t.pre = preMs;
    if (live) {
      // TOF prescan (1756-RM003 p. 122): ACC=PRE, DN=0, TT=0, EN=0 — once, before first scan work.
      if (k === 'TOF' && !t._tofPrescanDone) {
        t.acc = preMs;
        t.dn = false;
        t.running = false;
        t.en = false;
        t._tofPrescanDone = true;
      }
      if (k === 'TON') {
        // PRE=0 → ACC stays 0 and DN is true as soon as enabled (ACC >= PRE).
        t.acc = enabled ? Math.min(preMs, t.acc + st.dt) : 0;
      } else if (k === 'TOF') {
        if (enabled) t.acc = 0;
        else t.acc = Math.min(preMs, t.acc + st.dt);
      } else if (enabled) {
        t.acc = Math.min(preMs, t.acc + st.dt);
      }
      t.en = !!enabled;
    }
    if (k === 'TON') t.dn = !!enabled && t.acc >= preMs;
    else if (k === 'TOF') t.dn = !!enabled || t.acc < preMs;
    else t.dn = t.acc >= preMs;
    // TON/RTO time while enabled and not yet done; TOF times only while input is FALSE.
    t.running = (k === 'TOF' ? !enabled : !!enabled) && t.acc < preMs;
    node._state = t;
    // Logix: Set Rung-condition-out to Rung-condition-in (status is .EN/.TT/.DN, not RCO).
    return !!enabled;
  }

  if (k === 'RES') {
    const target = node.a;
    if (live && enabled && target) {
      if (st.timers[target]) Object.assign(st.timers[target], { acc: 0, dn: false, running: false, en: false });
      if (st.counters[target]) Object.assign(st.counters[target], { acc: 0, dn: false, cu: false, cd: false, prevIn: false });
    }
    return !!enabled;
  }

  if (['CTU', 'CTD'].includes(k)) {
    const c = (st.counters[node.a] ??= { acc: 0, dn: false, cu: false, cd: false, prevIn: false });
    const pre = num(operandValue(param(node, 'Target') ?? param(node, 'PRE'), st));
    c.pre = pre;
    if (live) {
      // Edge against the prior enable bit (.CU / .CD). Count Up (CTU), p. 99: when
      // rung-condition-in is true and .CU is false, ACC increments by one; when
      // rung-condition-in is false, .CU clears. Count Down (CTD), p. 93: the same
      // edge decrements .ACC, and a false rung clears .CD.
      // Prescan is applyCtuPrescan (.CU true, p. 100; .CD true, p. 94), used by the
      // lab and the editor on a fresh or Reset image. It is not inside this call.
      if (k === 'CTU') {
        if (enabled && !c.cu) c.acc += 1;
        c.cu = !!enabled;
        c.prevIn = !!enabled;
      } else {
        if (enabled && !c.cd) c.acc -= 1;
        c.cd = !!enabled;
        c.prevIn = !!enabled;
      }
      // .DN stays set once .ACC has reached .PRE and the count keeps moving.
      // CTU example, p. 101: after the preset count, .DN is set and remains set
      // while the counter keeps incrementing. The shared buffer example, p. 97,
      // calls counter.DN true at the preset. The CTD structure line in this extract
      // says "when clear"; that disagrees with the example, so this engine follows
      // the example and the CTU wording ("when set"). IEC CTD Q at CV <= 0 is different.
      c.dn = c.acc >= pre;
    }
    node._state = c;
    // Logix: Set Rung-condition-out to Rung-condition-in.
    return !!enabled;
  }

  if (k === 'ONS') {
    const key = node.a || ctx.path;
    const prev = !!st.prevEdges[key];
    const rising = enabled && !prev;
    if (live) st.prevEdges[key] = enabled;
    return rising;
  }

  if (k === 'LIM') {
    // 1756-RM003 pp. 314, 318-319, 321: LIM tests Test against Low and High.
    // It does not write a clamped number. NAN, or an operand this simulator
    // cannot read as a number, does not pass.
    const low = operandValue(param(node, 'LO') ?? param(node, 'LowLimit'), st);
    const testValue = operandValue(param(node, 'IN') ?? param(node, 'Test'), st);
    const high = operandValue(param(node, 'HI') ?? param(node, 'HighLimit'), st);
    return limitTestPasses(low, testValue, high);
  }

  if (k === 'MOV' || k === 'CPT' || k === 'SEL' || k === 'PID' || k === 'MSG') {
    if (live && enabled) applyDataOp(node, st, ctx);
    return !!enabled;
  }
  return !!enabled;
}

/** Inclusive band when Low <= High. When Low > High, true on either limit or outside the open interval. */
function limitTestPasses(low, testValue, high) {
  if (typeof low !== 'number' || typeof testValue !== 'number' || typeof high !== 'number') return false;
  if (Number.isNaN(low) || Number.isNaN(testValue) || Number.isNaN(high)) return false;
  if (low <= high) return testValue >= low && testValue <= high;
  return testValue <= high || testValue >= low;
}

function applyDataOp(node, st, ctx) {
  const dst = param(node, 'DST') || param(node, 'DEST');
  if (!dst) return;
  let v = null;
  if (node.k === 'MOV') v = resolveOperand(param(node, 'SRC'), st.values);
  else if (node.k === 'SEL') v = resolveOperand(bitOf(st, param(node, 'GATE')) ? param(node, 'TRUE') : param(node, 'FALSE'), st.values);
  else if (node.k === 'CPT') v = evalExpr(param(node, 'EXPR'), st.values);
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
    } else if ((key === 'CU' || key === 'CD') && store && typeof store[key.toLowerCase()] === 'boolean') {
      // COUNTER status bits. A pin named CU/CD used to be treated as an accumulator alias;
      // no seeded rung uses that pin name. Show the enable bit when the counter has one.
      out = store[key.toLowerCase()] ? 'TRUE' : 'false';
    } else if (key === 'ACC' || key === 'ET' || key === 'CU' || key === 'CD' || key === 'CV') {
      out = store ? Math.round(store.acc ?? 0) : resolveOperand(p.v, st.values) ?? p.v;
    } else if (key === 'DN' || key === 'Q' || key === 'V') {
      out = store ? (store.dn ? 'TRUE' : 'false') : resolveOperand(p.v, st.values) ?? p.v;
    } else if (key === 'TT' || key === 'RUN') {
      out = store ? (store.running ? 'TRUE' : 'false') : p.v;
    } else if (key === 'EN') {
      out = store ? (store.en ? 'TRUE' : 'false') : p.v;
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
    // Logix timers/counters (RCO=RCI), and ONS are evaluated locally first (they must update
    // every scan in a real controller), then gated by the incoming rung power.
    const local = evalLeaf(node, ctx);
    // Logix TON/TOF/RTO/CTU/CTD: rung-condition-out = rung-condition-in (local already
    // returned RCI). Coils and IEC-style state blocks may publish a retained bit as conduction.
    const logixPass = node.t === 'blk' && LOGIX_PASS_THROUGH.has(node.k);
    const publishesState = node.t === 'coil' || (node.t === 'blk' && STATE_BLOCKS.has(node.k));
    const out = logixPass ? local : (publishesState ? local : (powered && local));
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

function joinWire(wires, x1, y1, x2, y2, c) {
  if (Math.abs(y1 - y2) < 0.5) {
    if (Math.abs(x1 - x2) >= 0.5) wires.push({ x1, x2, y: y1, c: !!c });
    return;
  }
  const midX = (x1 + x2) / 2;
  if (Math.abs(x1 - midX) >= 0.5) wires.push({ x1, x2: midX, y: y1, c: !!c });
  wires.push({ vertical: true, x: midX, y1, y2, c: !!c });
  if (Math.abs(midX - x2) >= 0.5) wires.push({ x1: midX, x2, y: y2, c: !!c });
}

export function layout(node, map, geo = GEO) {
  const hasMap = !!(map && map.size);
  const outOf = (n) => (hasMap ? !!map.get(n) : false);

  const box = (n, incoming) => {
    if (!n) {
      const port = geo.rowH / 2;
      return { w: 0, h: geo.rowH, items: [], wires: [], c: false, inX: 0, inY: port, outX: 0, outY: port };
    }
    if (n.t === 'and') {
      const nodes = n.c || [];
      const kids = [];
      let power = !!incoming;
      for (const child of nodes) {
        kids.push(box(child, power));
        power = outOf(child);
      }
      const gap = kids.length > 1 ? geo.gap : 0;
      const h = Math.max(geo.rowH, ...kids.map((k) => k.h), 1);
      const items = [];
      const wires = [];
      let x = 0;
      kids.forEach((k, idx) => {
        const yOff = (h - k.h) / 2;
        k.items.forEach((it) => items.push({ ...it, x: it.x + x, y: it.y + yOff }));
        k.wires.forEach((wr) => wires.push(shiftWire(wr, x, yOff)));
        if (idx > 0) {
          const prev = kids[idx - 1];
          const y1 = (h - prev.h) / 2 + prev.outY;
          const y2 = yOff + k.inY;
          joinWire(wires, x - gap, y1, x, y2, outOf(nodes[idx - 1]));
        }
        x += k.w + (idx < kids.length - 1 ? gap : 0);
      });
      const first = kids[0];
      const last = kids[kids.length - 1];
      const inY = first ? (h - first.h) / 2 + first.inY : h / 2;
      const outY = last ? (h - last.h) / 2 + last.outY : h / 2;
      return { w: Math.max(x, 1), h, items, wires, c: outOf(n), inX: 0, inY, outX: Math.max(x, 1), outY };
    }
    if (n.t === 'or') {
      const nodes = n.c || [];
      const kids = nodes.map((child) => box(child, incoming));
      const innerW = Math.max(1, ...kids.map((k) => k.w));
      const h = kids.reduce((s, k) => s + k.h, 0) + geo.branchGap * (kids.length + 1);
      const items = [];
      const wires = [];
      let y = geo.branchGap;
      const ports = [];
      kids.forEach((k, idx) => {
        k.items.forEach((it) => items.push({ ...it, x: it.x, y: it.y + y }));
        k.wires.forEach((wr) => wires.push(shiftWire(wr, 0, y)));
        const portY = y + k.inY;
        ports.push(portY);
        if (k.outX < innerW - 0.5) wires.push({ x1: k.outX, x2: innerW, y: portY, c: outOf(nodes[idx]) });
        y += k.h + geo.branchGap;
      });
      const mid = h / 2;
      const y1 = Math.min(ports[0] ?? mid, mid);
      const y2 = Math.max(ports[ports.length - 1] ?? mid, mid);
      const any = nodes.some((child) => outOf(child));
      if (Math.abs(y1 - y2) >= 0.5) {
        wires.push({ vertical: true, x: 0, y1, y2, c: !!incoming, bus: true });
        wires.push({ vertical: true, x: innerW, y1, y2, c: any, bus: true });
      }
      return { w: innerW, h, items, wires, c: outOf(n), inX: 0, inY: mid, outX: innerW, outY: mid };
    }
    const size = leafSize(n, geo);
    const port = geo.rowH / 2;
    return {
      w: size.w,
      h: size.h,
      items: [{ node: n, x: 0, y: 0, ...size, c: outOf(n), inC: !!incoming }],
      wires: [],
      c: outOf(n),
      inX: 0,
      inY: port,
      outX: size.w,
      outY: port
    };
  };

  const root = box(node, true);
  return { ...root, h: Math.max(root.h, geo.rowH) };
}

function leafSize(n, geo) {
  if (n.t === 'coil') return { w: geo.coilW, h: geo.rowH };
  if (n.t === 'blk') { const rows = Math.max(1, (n.p || []).length); return { w: geo.blockW, h: Math.max(geo.rowH, 30 + rows * 20) }; }
  if (n.t === 'short') return { w: 44, h: geo.rowH };
  return { w: geo.contactW, h: geo.rowH };
}

/**
 * Box for a function-block instruction. A tall block used to be centered on the
 * contact row, which pushed its title above y=0 and clipped "TON T_Delay".
 * The box stays inside the instruction slot so the title baseline is below the slot top.
 */
export function blockBounds(it, geo = GEO) {
  const bh = Math.max(it?.h || 0, geo.rowH - 14);
  const centered = it.y + (geo.rowH - bh) / 2;
  const boxY = it.h > geo.rowH ? it.y : Math.max(it.y, centered);
  return { boxY, bh, titleY: boxY + 15, bottom: boxY + bh + (it.node?.l ? 16 : 0) };
}

/**
 * Place the power rails around a layout() box.
 * The right rail sits one rail-pad past the rightmost instruction, and the output
 * wire runs from that instruction to the rail. layout()'s returned width includes
 * spare padding that is not part of the glyphs; using it as the wire start left a
 * gap and a short stub at a rail that floated to the right of the coil.
 */
export function frameLadder(box, { geo = GEO, conducts = false, inputHot = false } = {}) {
  const pad = geo.railPad;
  const shift = pad + 6;
  const contentH = Math.max(box.h, geo.rowH + 20);
  const inX = (box.inX ?? 0) + shift;
  const inY = (box.inY ?? geo.rowH / 2) + 8;
  const outX = (box.outX ?? 0) + shift;
  const outY = (box.outY ?? geo.rowH / 2) + 8;
  const leftRail = pad;
  const rightRail = outX + pad;
  const w = rightRail + 6;
  const items = box.items.map((it) => ({ ...it, x: it.x + shift, y: it.y + 8 }));
  let h = contentH + 16;
  for (const it of items) {
    if (it.node?.t === 'blk') h = Math.max(h, blockBounds(it, geo).bottom + 6);
  }
  const wires = box.wires.map((wr) => (wr.vertical
    ? { ...wr, x: wr.x + shift, y1: wr.y1 + 8, y2: wr.y2 + 8 }
    : { ...wr, x1: wr.x1 + shift, x2: wr.x2 + shift, y: wr.y + 8 }));
  const inputWire = { x1: leftRail, x2: inX, y: inY, c: !!inputHot, edge: 'in' };
  const outputWire = { x1: outX, x2: rightRail, y: outY, c: !!conducts, edge: 'out' };
  wires.push(inputWire, outputWire);
  return { w, h, items, wires, leftRail, rightRail, contentRight: outX, inputWire, outputWire };
}

/** Largest distance from a wire end to the thing it should touch. 0 means the drawing is closed. */
export function maxWireGap(frame, geo = GEO) {
  const ports = [];
  for (const it of frame.items || []) {
    const y = it.y + geo.rowH / 2;
    ports.push({ x: it.x, y }, { x: it.x + it.w, y });
  }
  const horiz = (frame.wires || []).filter((w) => !w.vertical);
  const vert = (frame.wires || []).filter((w) => w.vertical);
  const ends = [];
  for (const w of horiz) ends.push({ x: w.x1, y: w.y }, { x: w.x2, y: w.y });
  if (frame.inputWire) ports.push({ x: frame.leftRail, y: frame.inputWire.y });
  if (frame.outputWire) ports.push({ x: frame.rightRail, y: frame.outputWire.y });
  const hit = (x, y, skip) => {
    if (ports.some((p) => Math.abs(p.x - x) < 0.6 && Math.abs(p.y - y) < 0.6)) return true;
    if (vert.some((v) => Math.abs(v.x - x) < 0.6 && y + 0.6 >= Math.min(v.y1, v.y2) && y - 0.6 <= Math.max(v.y1, v.y2))) return true;
    return ends.some((p, i) => i !== skip && Math.abs(p.x - x) < 0.6 && Math.abs(p.y - y) < 0.6);
  };
  let max = 0;
  ends.forEach((p, i) => {
    if (hit(p.x, p.y, i)) return;
    const dist = [...ports, ...ends.filter((_, j) => j !== i)].reduce((best, q) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      return d < best ? d : best;
    }, Infinity);
    if (dist > max) max = dist;
  });
  vert.forEach((v) => {
    for (const y of [v.y1, v.y2]) {
      const joined = horiz.some((w) => Math.abs(w.y - y) < 0.6 && (Math.abs(w.x1 - v.x) < 0.6 || Math.abs(w.x2 - v.x) < 0.6))
        || ports.some((p) => Math.abs(p.x - v.x) < 0.6 && Math.abs(p.y - y) < 0.6)
        || vert.some((other) => other !== v && Math.abs(other.x - v.x) < 0.6 && y + 0.6 >= Math.min(other.y1, other.y2) && y - 0.6 <= Math.max(other.y1, other.y2));
      if (!joined) max = Math.max(max, 1);
    }
  });
  return max;
}

/**
 * Fit a rung to the canvas.
 * At 640px and wider, shrink to the canvas and do not scroll, which is the desktop drawing.
 * Below 640px, do not shrink the 12.5px tag name under 12px. A wider rung scrolls in its box.
 * Does not scale up: a short rung stays at its drawn size.
 */
export function fitRung(svgWidth, canvasWidth) {
  const width = Math.max(1, svgWidth);
  const canvas = Math.max(0, canvasWidth);
  const natural = canvas > 0 ? Math.min(1, canvas / width) : 1;
  const narrow = canvas > 0 && canvas < LADDER_NARROW_PX;
  const minScale = LADDER_MIN_TAG_FONT_PX / LADDER_TAG_FONT_PX;
  const scale = narrow ? Math.max(natural, minScale) : natural;
  const scrolls = narrow && natural + 1e-9 < minScale;
  return { scale, scrolls, renderWidth: width * scale, tagFontPx: LADDER_TAG_FONT_PX * scale };
}

/* ------------------------------------------------------------------ state helpers */
/**
 * 1756-RM003 counter prescan, once per fresh image. A later call does nothing.
 * Reset starts a new image. CTU (p. 100): .CU is set true so an input that is
 * already true does not increment. CTD (p. 94): .CD is set true so an input that
 * is already true does not decrement. Pass CTD tags as the third argument.
 */
export function applyCtuPrescan(state, tags, ctdTags = []) {
  if (!state || state._ctuPrescan) return state;
  const blank = () => ({ acc: 0, dn: false, cu: false, cd: false, prevIn: false });
  for (const tag of tags || []) {
    if (!tag) continue;
    const counter = (state.counters[tag] ??= blank());
    counter.cu = true;
  }
  for (const tag of ctdTags || []) {
    if (!tag) continue;
    const counter = (state.counters[tag] ??= blank());
    counter.cd = true;
  }
  state._ctuPrescan = true;
  return state;
}

function counterTagsInLadder(ladder, kind) {
  const tags = [];
  const walk = (node) => {
    if (!node) return;
    if (node.t === 'and' || node.t === 'or') (node.c || []).forEach(walk);
    else if (node.t === 'blk' && String(node.k || '').toUpperCase() === kind && node.a) tags.push(String(node.a));
  };
  walk(ladder);
  return tags;
}

export function ctuTagsInLadder(ladder) {
  return counterTagsInLadder(ladder, 'CTU');
}

export function ctdTagsInLadder(ladder) {
  return counterTagsInLadder(ladder, 'CTD');
}

/** Lab default. Kept at 1 s so a 120 s lockout and the other long lab timers still finish under Auto-scan. The editor uses 100 ms. */
export const LAB_DEFAULT_SCAN_MS = 1000;

/** One live pass over lab rungs. The first pass on a fresh or Reset image applies CTU and CTD prescan. */
export function scanLadders(ladders, state) {
  const rungs = ladders || [];
  applyCtuPrescan(state, rungs.flatMap(ctuTagsInLadder), rungs.flatMap(ctdTagsInLadder));
  return rungs.map((ladder) => analyze(ladder, state, { live: true }));
}

export function initialState(io = []) {
  const bits = {}, values = {}, timers = {}, counters = {}, prevEdges = {};
  for (const p of io) {
    if (!p?.tag) continue;
    const init = p.initial ?? 0;
    if (['DI', 'DO', 'BIT'].includes(p.type)) bits[p.tag] = init ? 1 : 0;
    else if (p.type === 'TIMER') {
      // A new teaching image starts timers at ACC=0. Logix TON prescan also clears
      // ACC (p. 132). Logix RTO prescan clears .EN and .TT and does not list .ACC
      // (p. 112); this image still starts at 0 because it is a new program, not a
      // retained RTO. TOF prescan sets ACC=PRE (p. 122), applied on the first live
      // TOF evaluation once PRE is known. Optional instruction:'TOF' + preMs on the
      // I/O row can pre-load ACC=PRE for tests.
      const instr = String(p.instruction || p.kind || '').toUpperCase();
      const preMs = Number(p.preMs ?? p.pre ?? 0) || 0;
      const isTof = instr === 'TOF';
      timers[p.tag] = {
        acc: isTof ? preMs : 0,
        dn: false,
        running: false,
        en: false,
        pre: preMs || undefined,
        _tofPrescanDone: isTof && preMs > 0
      };
    } else if (p.type === 'COUNTER') {
      counters[p.tag] = { acc: Number(init) || 0, dn: false, cu: false, cd: false, prevIn: false };
    } else values[p.tag] = Number(init) || 0;
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
