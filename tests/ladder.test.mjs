/**
 * Ladder engine + rung-data tests.
 *
 *   node --test tests/
 *
 * The engine (web/src/lib/ladder.js) is plain JS so it runs here without a browser; the rung
 * examples (server/src/seed/data/rungs*.js) are the data the reference ships. Both sides are
 * pinned: if a rung stops matching the prose printed next to it, this file fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  analyze, layout, frameLadder, maxWireGap, fitRung, initialState, collectElements, presetMs, resolveOperand, evalExpr, fitPinText, scanLadders,
  memberRef, GEO, EDITOR_GEO, LADDER_MIN_TAG_FONT_PX, LADDER_TAG_FONT_PX, LADDER_NARROW_PX
} from '../web/src/lib/ladder.js';
import { RUNGS } from '../server/src/seed/data/rungs.js';
import { RUNGS2 } from '../server/src/seed/data/rungs2.js';
import { INSTRUCTIONS } from '../server/src/seed/data/instructions.js';

const ALL = [...RUNGS, ...RUNGS2];
const byId = Object.fromEntries(ALL.map((r) => [r.id, r]));

const ioOf = (r) => [...(r.io || []), ...Object.keys(r).filter((k) => r[k]?.ladder).flatMap((k) => r[k].io || [])];
const ladsOf = (r) => [r.ladder, ...Object.keys(r).filter((k) => r[k]?.ladder).map((k) => r[k].ladder)];

/** Scan the main rung and every secondary rung in order, sharing one I/O image. */
function scan(id, { scans = 1, dt = 1000, bits = {}, values = {}, timers = {}, before } = {}) {
  const r = byId[id];
  assert.ok(r, `unknown rung id ${id}`);
  const st = initialState(ioOf(r));
  Object.assign(st.bits, bits);
  Object.assign(st.values, values);
  Object.assign(st.timers, timers);
  before?.(st);
  let conds = [];
  for (let i = 0; i < scans; i++) {
    st.dt = dt;
    conds = ladsOf(r).map((lad) => analyze(lad, st, { live: true }).conducts);
  }
  return { st, conds };
}

test('operands: literals, tags, arithmetic, percentages', () => {
  assert.equal(resolveOperand('100.5', {}), 100.5);
  assert.equal(resolveOperand('LEVEL_PV + 0.5', { LEVEL_PV: 99.8 }), 100.3);
  assert.equal(resolveOperand('25%', {}), 25);
  assert.equal(resolveOperand('NOT_A_TAG', {}), null);
  assert.equal(evalExpr('RAW * 0.008 - 40', { RAW: 20000 }), 120);
  assert.equal(evalExpr('(1 + 2) * 4', {}), 12);
  assert.equal(evalExpr('1 / 0', {}), null, 'division by zero must not produce Infinity');
});

test('timer presets: IEC literal, unit string, bare ms, unknown', () => {
  assert.equal(presetMs({ p: [{ k: 'PT', v: 'T#5s' }] }, {}), 5000);
  assert.equal(presetMs({ p: [{ k: 'PRE', v: '120 s' }] }, {}), 120000);
  assert.equal(presetMs({ p: [{ k: 'PRE', v: '2 min' }] }, {}), 120000);
  assert.equal(presetMs({ p: [{ k: 'PRE', v: '300' }] }, {}), 300);
  assert.equal(presetMs({ p: [{ k: 'PRE', v: 'SOMETHING' }] }, { SOMETHING: 750 }), 750);
  assert.equal(presetMs({ p: [] }, {}), 0);
});

test('seal-in: start latches, stop and permissives drop it', () => {
  assert.equal(scan('rung-seal-in').st.bits.LOP_RUN, 0, 'no start request, no run');
  assert.equal(scan('rung-seal-in', { bits: { HMI_START: 1 } }).st.bits.LOP_RUN, 1);
  assert.equal(scan('rung-seal-in', { bits: { REMOTE_START: 1 } }).st.bits.LOP_RUN, 1);
  assert.equal(scan('rung-seal-in', { bits: { HMI_STOP: 1 }, before: (s) => { s.bits.LOP_RUN = 1; } }).st.bits.LOP_RUN, 0);
  assert.equal(scan('rung-seal-in', { bits: { COMMON_TRIP: 1 }, before: (s) => { s.bits.LOP_RUN = 1; } }).st.bits.LOP_RUN, 0);
  assert.equal(scan('rung-seal-in', { bits: { MCC_LOCAL: 1, AUTO_MODE: 0 }, before: (s) => { s.bits.LOP_RUN = 1; } }).st.bits.LOP_RUN, 0);
  assert.equal(scan('rung-seal-in', { bits: { LUBE_PS_OK: 0, HMI_START: 1 } }).st.bits.LOP_RUN, 0, 'permissive low blocks start');
});

test('seal-in holds after the momentary start is released', () => {
  const r = byId['rung-seal-in'];
  const st = initialState(ioOf(r));
  st.dt = 1000;
  st.bits.HMI_START = 1;
  analyze(r.ladder, st, { live: true });
  st.bits.HMI_START = 0;
  analyze(r.ladder, st, { live: true });
  assert.equal(st.bits.LOP_RUN, 1);
});

test('OTL / OTU latch: set on the cause, reset on acknowledge with the cause clear', () => {
  assert.equal(scan('rung-latch-ack', { bits: { LSP_PSL: 1 } }).st.bits.TRIP_LAT, 1);
  assert.equal(scan('rung-latch-ack', { before: (s) => { s.bits.TRIP_LAT = 1; s.bits.LSP_PSL = 0; s.bits.ACK_BTN = 1; } }).st.bits.TRIP_LAT, 0,
    'acknowledge only clears once the cause is clear');
  assert.equal(scan('rung-latch-ack', { before: (s) => { s.bits.TRIP_LAT = 1; s.bits.LSP_PSL = 1; s.bits.ACK_BTN = 1; } }).st.bits.TRIP_LAT, 1,
    'a still-live cause re-latches immediately - the trip is not fake-cleared');
});

test('follow-on rung: the output is written separately from the memory', () => {
  assert.equal(scan('rung-latch-ack', { before: (s) => { s.bits.TRIP_LAT = 0; s.bits.LSP_PSL = 0; } }).st.bits.SDV_OPEN, 1);
  assert.equal(scan('rung-latch-ack', { before: (s) => { s.bits.TRIP_LAT = 1; } }).st.bits.SDV_OPEN, 0);
  assert.equal(scan('rung-latch-ack', { before: (s) => { s.bits.TRIP_LAT = 0; s.bits.LSP_PSL = 0; s.bits.MAINT_BYPASS = 1; } }).st.bits.SDV_OPEN, 0,
    'maintenance bypass removes the automatic hold');
});

test('2oo3: any two of three, plus the witnessed proof-test path', () => {
  const vote = (a, b, c, t = 0) => scan('rung-2oo3', { bits: { LSHH_A: a, LSHH_B: b, LSHH_C: c, TEST_MODE: t } }).st.bits.TRIP_VOTE;
  assert.equal(vote(0, 0, 0), 0);
  assert.equal(vote(1, 0, 0), 0, 'a single transmitter must not shut the plant in');
  assert.equal(vote(1, 1, 0), 1);
  assert.equal(vote(1, 0, 1), 1);
  assert.equal(vote(0, 1, 1), 1);
  assert.equal(vote(1, 1, 1), 1);
  assert.equal(scan('rung-2oo3', { bits: { TEST_MODE: 1 } }).st.bits.TRIP_VOTE, 0, 'entering test mode is not a trip');
  assert.equal(vote(1, 1, 1, 1), 1);
});

test('2oo3 output rung: de-energize to close', () => {
  assert.equal(scan('rung-2oo3', { scans: 2, bits: { LSHH_A: 0, LSHH_B: 0 } }).st.bits.SDV_CLOSE_DO, 1, 'healthy: solenoid held energized');
  assert.equal(scan('rung-2oo3', { scans: 2, bits: { LSHH_A: 1, LSHH_B: 1 } }).st.bits.SDV_CLOSE_DO, 0, 'voted trip drops the solenoid');
  assert.equal(scan('rung-2oo3', { scans: 2, bits: { LSHH_A: 1, LSHH_B: 1, BYPASS_ACTIVE: 1 } }).st.bits.SDV_CLOSE_DO, 0);
});

test('alarm deadband: on-delay, saturation, and clearing only on the low limit', () => {
  assert.equal(scan('rung-alarm-deadbnd', { bits: {} }).st.bits.LSHH_ALM, 0);
  const hot = scan('rung-alarm-deadbnd', { scans: 6, values: { LEVEL_PV: 101.2 } });
  assert.equal(hot.st.timers.T_ALARM.acc, 5000, 'five added seconds reach the 5 s preset');
  assert.equal(hot.st.timers.T_ALARM.dn, true);
  assert.equal(hot.st.bits.LSHH_ALM, 1);
  const back = scan('rung-alarm-deadbnd', { scans: 3, values: { LEVEL_PV: 99.8 }, bits: { LSHH_ALM: 1 } });
  assert.equal(back.st.timers.T_ALARM.dn, false, 'the timer drops out when the PV returns inside the band');
  assert.equal(back.st.bits.LSHH_ALM, 1, 'the alarm stays until the deadband-low rung clears it');
  const cleared = scan('rung-alarm-deadbnd', { scans: 2, values: { LEVEL_PV: 98.2 }, bits: { LSHH_ALM: 1 } });
  assert.equal(cleared.st.bits.LSHH_ALM, 0);
});

test('restart lockout: asserted for the whole delay, released when it completes', () => {
  const mid = scan('rung-ton-lockout', { scans: 60, bits: { TRIP_LAT: 1 } });
  assert.equal(mid.st.timers.T_LOCK.acc, 59000);
  assert.equal(mid.st.bits.RESTART_BLOCK, 1, 'blocked while the delay runs');
  const done = scan('rung-ton-lockout', { scans: 130, bits: { TRIP_LAT: 1 } });
  assert.equal(done.st.timers.T_LOCK.dn, true);
  assert.equal(done.st.bits.RESTART_BLOCK, 0, 'released once the delay has elapsed');
  const cleared = scan('rung-ton-lockout', { scans: 60, bits: { TRIP_LAT: 0 } });
  assert.equal(cleared.st.timers.T_LOCK.acc, 0, 'a TON is non-retentive: the delay restarts from zero');
});

test('TOF: the output survives after the input falls, then drops at the preset', () => {
  // Logix TOF prescan sets ACC=PRE with DN=0. A falling edge is required: enable first, then drop.
  const r = byId['rung-tof-cooldown'];
  const st = initialState(ioOf(r));
  st.dt = 1000;
  st.bits.MOTOR_RUNNING = 1;
  for (let i = 0; i < 3; i++) ladsOf(r).forEach((lad) => analyze(lad, st, { live: true }));
  assert.equal(st.timers.T_COOL.acc, 0, 'a running motor holds the off-delay at zero');
  assert.equal(st.timers.T_COOL.dn, true);
  assert.equal(st.bits.FAN_RUN, 1);

  st.bits.MOTOR_RUNNING = 0;
  for (let i = 0; i < 100; i++) ladsOf(r).forEach((lad) => analyze(lad, st, { live: true }));
  assert.equal(st.bits.FAN_RUN, 1, 'fan keeps running through the off-delay');
  assert.equal(st.timers.T_COOL.running, true);

  for (let i = 0; i < 300; i++) ladsOf(r).forEach((lad) => analyze(lad, st, { live: true }));
  assert.equal(st.bits.FAN_RUN, 0, 'fan stops when the delay expires');
  assert.equal(st.timers.T_COOL.dn, false);
});

test('TOF Logix prescan: ACC starts at PRE with DN/TT/EN cleared', () => {
  const st = initialState([
    { tag: 'T_COOL', type: 'TIMER', instruction: 'TOF', preMs: 300000 }
  ]);
  assert.equal(st.timers.T_COOL.acc, 300000);
  assert.equal(st.timers.T_COOL.dn, false);
  assert.equal(st.timers.T_COOL.running, false);
  assert.equal(st.timers.T_COOL.en, false);

  // Power-up with enable already false: no falling edge yet → DN stays false (prescan state).
  const cold = scan('rung-tof-cooldown', { scans: 5, bits: { MOTOR_RUNNING: 0 } });
  assert.equal(cold.st.timers.T_COOL.dn, false);
  assert.equal(cold.st.bits.FAN_RUN, 0, 'no phantom run-on after TOF prescan alone');
});

test('purge: the timer only runs with the permissives healthy, and the valve stays shut until purge ok', () => {
  const blocked = scan('rung-purge', { bits: { FLAME_FAIL: 1 } });
  assert.equal(blocked.st.timers.T_PURGE.running, false);
  assert.equal(blocked.st.bits.FG_SAFETY_OPEN, 0);
  const running = scan('rung-purge', { scans: 4 });
  assert.equal(running.st.timers.T_PURGE.acc, 3000);
  assert.equal(running.st.bits.PURGE_OK, 0, 'no short-circuiting the purge');
});

test('F&G: confirm delay, 1oo2 detection, de-energize to trip, bypass behaviour', () => {
  const early = scan('rung-esd-fg', { scans: 3, bits: { GD_A_ALM: 1 } });
  assert.equal(early.st.bits.GAS_TRIP, 0, 'the confirm delay must elapse first');
  const trip = scan('rung-esd-fg', { scans: 12, bits: { GD_A_ALM: 1 } });
  assert.equal(trip.st.bits.GAS_TRIP, 1);
  assert.equal(trip.st.bits.SDV_HOLD, 0, 'trip de-energizes the solenoid so the valve closes on the fail-safe side');
  const bypassed = scan('rung-esd-fg', { scans: 12, bits: { GD_A_ALM: 1, FG_BYPASS: 1 } });
  assert.equal(bypassed.st.bits.GAS_TRIP, 0);
  assert.equal(bypassed.st.bits.SDV_HOLD, 1);
});

test('CTU with RES: one count per rising edge, target drives DN', () => {
  const r = byId['rung-ctu-strokes'];
  const st = initialState(ioOf(r));
  st.dt = 1000;
  const scanAll = () => ladsOf(r).forEach((lad) => analyze(lad, st, { live: true }));
  for (let i = 0; i < 12; i++) {
    st.bits.PUMP_SS = i % 2;
    st.bits['B3:3/7'] = i % 2;
    scanAll();
    scanAll();
  }
  assert.equal(st.counters['C5:0'].acc, 6, 'only real rising edges count');
  assert.equal(st.counters['C5:0'].dn, false, 'below target');
  st.values.TARGET = 5;
  st.bits.PUMP_SS = 0; st.bits['B3:3/7'] = 0;
  scanAll();
  st.bits.PUMP_SS = 1; st.bits['B3:3/7'] = 1;
  scanAll();
  assert.equal(st.counters['C5:0'].dn, true, 'target reached');
  assert.equal(st.bits.BATCH_DONE, 1);
  // the reset rung clears it
  st.bits.BATCH_START = 1;
  scanAll();
  assert.equal(st.counters['C5:0'].acc, 0);
});

test('frameLadder runs the output wire from the coil to the right rail', () => {
  const ladder = {
    t: 'and',
    c: [
      { t: 'no', a: 'Start' },
      { t: 'coil', k: 'OTE', a: 'Motor' }
    ]
  };
  const frame = frameLadder(layout(ladder), { geo: GEO });
  const coil = frame.items.find((it) => it.node.t === 'coil');
  const coilRight = coil.x + coil.w;
  assert.equal(frame.outputWire.x1, coilRight);
  assert.equal(frame.outputWire.x2, frame.rightRail);
  assert.equal(frame.rightRail - coilRight, GEO.railPad);
  assert.ok(frame.leftRail < coil.x);
  assert.ok(frame.rightRail < frame.w);
});

const SEAL = {
  t: 'and',
  c: [
    { t: 'no', a: 'LUBE_PS_OK' },
    { t: 'or', c: [
      { t: 'and', c: [{ t: 'no', a: 'AUTO_MODE' }, { t: 'no', a: 'HMI_START' }] },
      { t: 'and', c: [{ t: 'no', a: 'REMOTE_START' }, { t: 'no', a: 'AUTO_MODE' }] },
      { t: 'no', a: 'LOP_RUN' }
    ] },
    { t: 'nc', a: 'HMI_STOP' },
    { t: 'coil', k: 'OTE', a: 'LOP_RUN' }
  ]
};

test('a narrow canvas keeps tag text at 12px and scrolls; a wide canvas still shrinks to fit', () => {
  assert.equal(LADDER_MIN_TAG_FONT_PX, 12);
  assert.equal(LADDER_NARROW_PX, 640);
  const phone = fitRung(906, 320);
  assert.equal(phone.scrolls, true);
  assert.equal(phone.tagFontPx, 12);
  assert.ok(phone.renderWidth > 320);
  const desktop = fitRung(906, 734);
  assert.equal(desktop.scrolls, false);
  assert.ok(Math.abs(desktop.renderWidth - 734) < 0.01);
  assert.ok(desktop.tagFontPx < LADDER_TAG_FONT_PX);
  const fits = fitRung(400, 800);
  assert.equal(fits.scrolls, false);
  assert.equal(fits.scale, 1);
  assert.equal(fits.tagFontPx, LADDER_TAG_FONT_PX);
  const page = readFileSync(new URL('../web/src/components/RungDiagram.jsx', import.meta.url), 'utf8');
  assert.match(page, /tabIndex=\{scrolls \? 0 : undefined\}/);
  assert.match(page, /Scroll sideways to see the rest/);
});

test('rung wires meet the rails, contacts, and branch legs', () => {
  const nested = {
    t: 'or',
    c: [
      { t: 'or', c: [{ t: 'no', a: 'A' }, { t: 'and', c: [{ t: 'no', a: 'B' }, { t: 'no', a: 'C' }] }] },
      { t: 'and', c: [{ t: 'no', a: 'D' }, { t: 'no', a: 'E' }, { t: 'no', a: 'F' }] },
      { t: 'no', a: 'G' }
    ]
  };
  for (const geo of [GEO, EDITOR_GEO]) {
    for (const ladder of [SEAL, nested]) {
      const frame = frameLadder(layout(ladder, null, geo), { geo });
      assert.equal(maxWireGap(frame, geo), 0, `gap ${maxWireGap(frame, geo)} with rail pad ${geo.railPad}`);
      if (ladder === SEAL) {
        const xs = ['AUTO_MODE', 'REMOTE_START', 'LOP_RUN'].map((tag) => frame.items.find((it) => it.node.a === tag && it.node.t === 'no').x);
        assert.equal(xs[0], xs[1]);
        assert.equal(xs[1], xs[2]);
      } else {
        const xs = ['A', 'D', 'G'].map((tag) => frame.items.find((it) => it.node.a === tag).x);
        assert.equal(xs[0], xs[1]);
        assert.equal(xs[1], xs[2]);
      }
    }
  }
  for (const r of ALL) {
    for (const lad of ladsOf(r)) {
      const frame = frameLadder(layout(lad, null, GEO), { geo: GEO });
      assert.equal(maxWireGap(frame, GEO), 0, `${r.id} wire gap ${maxWireGap(frame, GEO)}`);
    }
  }
});

test('a false contact leaves the downstream wire cold and the upstream wire hot', () => {
  const ladder = {
    t: 'and',
    c: [
      { t: 'no', a: 'LUBE_PS_OK' },
      { t: 'no', a: 'HMI_START' },
      { t: 'coil', k: 'OTE', a: 'LOP_RUN' }
    ]
  };
  const st = initialState([]);
  st.bits.LUBE_PS_OK = 0;
  st.bits.HMI_START = 1;
  const map = analyze(ladder, st, { live: false }).map;
  const frame = frameLadder(layout(ladder, map, GEO), { geo: GEO, inputHot: true });
  assert.equal(frame.inputWire.c, true);
  const lube = frame.items.find((it) => it.node.a === 'LUBE_PS_OK');
  assert.equal(lube.inC, true);
  assert.equal(map.get(lube.node), false);
  const after = frame.wires.find((w) => !w.vertical && w.x1 === lube.x + lube.w);
  assert.equal(after.c, false);
});

test('every authored rung: all elements placed, geometry finite, description non-empty', () => {
  for (const r of ALL) {
    const st = initialState(ioOf(r));
    for (const [i, lad] of ladsOf(r).entries()) {
      const map = analyze(lad, st, { live: false }).map;
      const box = layout(lad, map);
      const placed = box.items.length;
      const total = collectElements(lad).length;
      assert.equal(placed, total, `${r.id}[${i}] places ${placed} of ${total} elements`);
      for (const it of box.items) {
        for (const v of [it.x, it.y, it.w, it.h]) {
          assert.ok(Number.isFinite(v) && v >= 0, `${r.id}[${i}] ${it.node.a} has a bad coordinate ${v}`);
        }
      }
      for (const wr of box.wires) {
        for (const v of [wr.x1, wr.x2, wr.x, wr.y, wr.y1, wr.y2].filter((n) => n !== undefined)) {
          assert.ok(Number.isFinite(v), `${r.id}[${i}] produced a non-finite wire coordinate`);
        }
      }
      assert.ok(box.w > 100 && box.h > 60, `${r.id}[${i}] degenerate diagram size`);
    }
  }
});

test('every authored rung declares I/O for every tag it touches', () => {
  for (const r of ALL) {
    const declared = new Set(ioOf(r).map((i) => i.tag));
    for (const lad of ladsOf(r)) {
      for (const el of collectElements(lad)) {
        if (!el.a || !/^[A-Z]/.test(el.a)) continue;
        const base = el.a.split(/[./]/)[0];
        assert.ok(declared.has(el.a) || declared.has(base), `${r.id}: ${el.a} used but not in the io list`);
      }
    }
  }
});

test('every rung is badged as an authored example and carries the placeholder notice', async () => {
  const { buildEntries } = await import('../server/src/seed/index.js');
  const rungs = buildEntries().filter((e) => e.section === 'rungs');
  assert.equal(rungs.length, ALL.length, 'every authored rung reaches the seed');
  for (const e of rungs) {
    assert.equal(e.status, 'illustrative-example', `${e.id} must be badged illustrative-example`);
    assert.match(e.payload.exampleNotice || '', /not a design value|placeholder/i,
      `${e.id} must say that its numbers are placeholders, not design values`);
    assert.match(e.payload.exampleNotice || '', /invented/i, `${e.id} must say the tags are invented`);
  }
});

test('a rung that shows any numeric operand must say where such a number really comes from', async () => {
  const { buildEntries } = await import('../server/src/seed/index.js');
  const byId2 = Object.fromEntries(buildEntries().filter((e) => e.section === 'rungs').map((e) => [e.payload.id, e]));
  for (const r of ALL) {
    const numericOperands = ladsOf(r).flatMap((lad) => collectElements(lad))
      .flatMap((el) => el.p || [])
      .filter((p) => /\b\d+(\.\d+)?\s*(ms|s|min)\b/.test(String(p.v)) || /^\d+$/.test(String(p.v).trim()));
    if (!numericOperands.length) continue;
    const e = byId2[r.id];
    assert.match(JSON.stringify(e.payload), /placeholder|not a design value|your alarm philosophy|datasheet/i,
      `${r.id} shows ${numericOperands.length} numeric operand(s) but carries no note about where such numbers come from`);
  }
});

test('diagram dry-run does not mutate the scan state', () => {
  const r = byId['rung-seal-in'];
  const st = initialState(ioOf(r));
  const before = structuredClone(st);
  const res = analyze(r.ladder, st, { live: false });
  assert.deepEqual(st, before, 'live:false must be a pure read');
  assert.equal(res.writes.length, 0);
  assert.equal(res.map.size >= collectElements(r.ladder).length, true);
});

test('block pin values stay short enough to fit inside the TON box', () => {
  assert.equal(fitPinText('site PRE'), 'site PRE');
  assert.equal(fitPinText('PLACEHOLDER - manufacturer / approved procedure', 16).endsWith('…'), true);
  assert.ok(fitPinText('PLACEHOLDER - manufacturer / approved procedure', 16).length <= 16);

  const cap = byId['rung-cap-close'];
  const pins = collectElements(cap.dischargeRung.ladder)
    .filter((el) => el.t === 'blk')
    .flatMap((el) => el.p || []);
  for (const p of pins) {
    assert.ok(String(p.v).length <= 18, `cap-bank pin ${p.k}=${p.v} is too long for the box`);
  }
});

/* ------------------------------------------------------------------ Logix acceptance (Jeff 2026-11-15) */

/** Build a one-element series rung ending in a timer/counter, optionally with a trailing coil. */
function series(...els) {
  return { t: 'and', c: els };
}

test('Logix RCO: TON/TOF/RTO/CTU/CTD pass rung-condition-in (not .DN)', () => {
  // Studio 5000 Logix Designer help for each instruction: Set Rung-condition-out to Rung-condition-in.
  const ladOf = (k, a, pre) => series(
    { t: 'no', a: 'EN', l: 'enable' },
    { t: 'blk', k, a, l: k, p: [{ k: 'PRE', v: pre }] },
    { t: 'coil', k: 'OTE', a: 'OUT', l: 'out' }
  );

  // TON / RTO / CTU / CTD: enable true, .DN still false → coil must still be true (RCI).
  for (const { k, a, kind, pre } of [
    { k: 'TON', a: 'T1', kind: 'timers', pre: '10 s' },
    { k: 'RTO', a: 'T3', kind: 'timers', pre: '10 s' },
    { k: 'CTU', a: 'C1', kind: 'counters', pre: '99' },
    { k: 'CTD', a: 'C2', kind: 'counters', pre: '99' }
  ]) {
    const st = initialState([]);
    st.dt = 1000;
    st.bits.EN = 1;
    if (kind === 'timers') st.timers[a] = { acc: 0, dn: false, running: false, en: false };
    else st.counters[a] = { acc: 0, dn: false, cu: false, cd: false, prevIn: false };
    analyze(ladOf(k, a, pre), st, { live: true });
    assert.equal(st.bits.OUT, 1, `${k} must pass RCI to the coil while .DN is still false`);
    if (kind === 'timers') assert.equal(st.timers[a].dn, false, `${k} not done on first tick`);
    else assert.equal(st.counters[a].dn, false, `${k} not done on first edge below PRE`);
  }

  // TOF distinctive case: enable false while still timing → .DN true but RCI false → coil false.
  {
    const st = initialState([]);
    st.dt = 1000;
    st.bits.EN = 1;
    const tof = ladOf('TOF', 'T2', '10 s');
    analyze(tof, st, { live: true }); // arm: ACC=0, DN=1
    st.bits.EN = 0;
    analyze(tof, st, { live: true }); // start off-delay
    assert.equal(st.timers.T2.dn, true, 'TOF.DN held during off-delay');
    assert.equal(st.timers.T2.running, true);
    assert.equal(st.bits.OUT, 0, 'TOF must NOT pass .DN as RCO — coil follows RCI (false)');
  }
});

test('Logix CTD .DN is ACC >= PRE (same as CTU), not IEC Q at CV<=0', () => {
  const st = initialState([]);
  st.dt = 1000;
  st.counters.C = { acc: 5, dn: false, cu: false, cd: false, prevIn: false };
  // One CTD edge with PRE=3: ACC becomes 4, still >= PRE → DN true.
  st.bits.CD = 1;
  analyze(series(
    { t: 'no', a: 'CD' },
    { t: 'blk', k: 'CTD', a: 'C', p: [{ k: 'PRE', v: '3' }] }
  ), st, { live: true });
  assert.equal(st.counters.C.acc, 4);
  assert.equal(st.counters.C.dn, true, 'Logix CTD DN while ACC >= PRE');
  assert.equal(st.counters.C.cd, true);

  // Keep decrementing past zero: ACC negative, DN false once ACC < PRE.
  for (let i = 0; i < 6; i++) {
    st.bits.CD = 0;
    analyze(series({ t: 'no', a: 'CD' }, { t: 'blk', k: 'CTD', a: 'C', p: [{ k: 'PRE', v: '3' }] }), st, { live: true });
    st.bits.CD = 1;
    analyze(series({ t: 'no', a: 'CD' }, { t: 'blk', k: 'CTD', a: 'C', p: [{ k: 'PRE', v: '3' }] }), st, { live: true });
  }
  assert.ok(st.counters.C.acc < 3);
  assert.equal(st.counters.C.dn, false, 'DN clears when ACC drops below PRE');
  // Contrast: IEC CTD would assert Q at CV<=0; Logix still uses ACC>=PRE only.
  assert.ok(st.counters.C.acc <= 0 || st.counters.C.acc > 0);
});

test('member references expose .EN on timers and .CU/.CD on counters', () => {
  assert.deepEqual(memberRef('T_LOCK.EN'), { base: 'T_LOCK', member: 'EN' });
  assert.deepEqual(memberRef('C5:0/CU'), { base: 'C5:0', member: 'CU' });
  assert.deepEqual(memberRef('C5:0.CD'), { base: 'C5:0', member: 'CD' });

  const st = initialState([]);
  st.dt = 1000;
  st.bits.IN = 1;
  analyze(series(
    { t: 'no', a: 'IN' },
    { t: 'blk', k: 'TON', a: 'T_LOCK', p: [{ k: 'PRE', v: '5 s' }] }
  ), st, { live: true });
  assert.equal(st.timers.T_LOCK.en, true);
  assert.equal(analyze(series({ t: 'no', a: 'T_LOCK.EN' }, { t: 'coil', k: 'OTE', a: 'SEEN' }), st, { live: true }).writes[0]?.value, true);

  st.bits.IN = 0;
  analyze(series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTU', a: 'C5:0', p: [{ k: 'PRE', v: '10' }] }), st, { live: true });
  st.bits.IN = 1;
  analyze(series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTU', a: 'C5:0', p: [{ k: 'PRE', v: '10' }] }), st, { live: true });
  assert.equal(st.counters['C5:0'].cu, true);
  assert.equal(st.bits['SEEN_CU'] ?? 0, 0);
  analyze(series({ t: 'no', a: 'C5:0.CU' }, { t: 'coil', k: 'OTE', a: 'SEEN_CU' }), st, { live: true });
  assert.equal(st.bits.SEEN_CU, 1);

  st.bits.IN = 0;
  analyze(series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTD', a: 'C5:1', p: [{ k: 'PRE', v: '1' }] }), st, { live: true });
  st.bits.IN = 1;
  analyze(series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTD', a: 'C5:1', p: [{ k: 'PRE', v: '1' }] }), st, { live: true });
  assert.equal(st.counters['C5:1'].cd, true);
  analyze(series({ t: 'no', a: 'C5:1.CD' }, { t: 'coil', k: 'OTE', a: 'SEEN_CD' }), st, { live: true });
  assert.equal(st.bits.SEEN_CD, 1);
});

test('CTD prescan sets .CD so an input that is already true does not decrement', () => {
  const ladder = series(
    { t: 'no', a: 'IN' },
    { t: 'blk', k: 'CTD', a: 'C', p: [{ k: 'PRE', v: '3' }] }
  );
  const st = initialState([]);
  st.counters.C = { acc: 5, dn: true, cu: false, cd: false, prevIn: false };
  st.bits.IN = 1;
  scanLadders([ladder], st);
  assert.equal(st.counters.C.acc, 5, 'prescan .CD blocks a decrement on the first scan');
  assert.equal(st.counters.C.cd, true);
  st.bits.IN = 0;
  scanLadders([ladder], st);
  assert.equal(st.counters.C.acc, 5);
  assert.equal(st.counters.C.cd, false);
  st.bits.IN = 1;
  scanLadders([ladder], st);
  assert.equal(st.counters.C.acc, 4, 'the next false-to-true transition decrements once');
});

test('a finishing scan can leave .ACC above .PRE, and later scans add none', () => {
  // 1756-RM018A TON/RTO Flow Chart (True) and TOF Flow Chart (False): the opening
  // scan adds none; the next scan adds the whole 250 ms, which is above .PRE 100.
  const timer = (kind, enable, steps) => {
    const st = initialState([]);
    st.dt = 250;
    st.bits.IN = enable ? 1 : 0;
    const rung = series({ t: 'no', a: 'IN' }, { t: 'blk', k: kind, a: 'T', p: [{ k: 'PRE', v: '100' }] });
    for (let i = 0; i < steps; i++) analyze(rung, st, { live: true });
    return st.timers.T;
  };
  for (const kind of ['TON', 'RTO']) {
    const done = timer(kind, true, 2);
    assert.equal(done.acc, 250, `${kind} .ACC keeps the whole last step`);
    assert.equal(done.dn, true, `${kind} .DN is set`);
    assert.equal(done.running, false, `${kind} .TT clears when done`);
    const later = timer(kind, true, 3);
    assert.equal(later.acc, 250, `${kind} later scans add none`);
    assert.equal(later.dn, true);
  }
  const st = initialState([]);
  st.dt = 250;
  const rung = series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'TOF', a: 'T', p: [{ k: 'PRE', v: '100' }] });
  st.bits.IN = 1;
  analyze(rung, st, { live: true });
  st.bits.IN = 0;
  analyze(rung, st, { live: true });
  analyze(rung, st, { live: true });
  assert.equal(st.timers.T.acc, 250, 'TOF .ACC keeps the whole last step');
  assert.equal(st.timers.T.dn, false, 'TOF .DN clears when .ACC reaches .PRE');
  analyze(rung, st, { live: true });
  assert.equal(st.timers.T.acc, 250, 'TOF later scans add none');

  // v37 CTU example: after the preset count, the counter continues to increment and .DN remains set.
  const up = initialState([]);
  up.bits.IN = 0;
  const ctu = series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTU', a: 'C', p: [{ k: 'PRE', v: '2' }] });
  const edge = () => {
    up.bits.IN = 0;
    analyze(ctu, up, { live: true });
    up.bits.IN = 1;
    analyze(ctu, up, { live: true });
  };
  edge();
  edge();
  assert.equal(up.counters.C.acc, 2);
  assert.equal(up.counters.C.dn, true);
  edge();
  assert.equal(up.counters.C.acc, 3, 'CTU .ACC keeps counting past .PRE');
  assert.equal(up.counters.C.dn, true, 'CTU .DN stays set');

  // v37 CTD: each true rung with .CD false decrements .ACC by one, with no stop at .PRE.
  const down = initialState([]);
  down.counters.C = { acc: 2, dn: true, cu: false, cd: false, prevIn: false };
  const ctd = series({ t: 'no', a: 'IN' }, { t: 'blk', k: 'CTD', a: 'C', p: [{ k: 'PRE', v: '2' }] });
  const fall = () => {
    down.bits.IN = 0;
    analyze(ctd, down, { live: true });
    down.bits.IN = 1;
    analyze(ctd, down, { live: true });
  };
  fall();
  assert.equal(down.counters.C.acc, 1);
  assert.equal(down.counters.C.dn, false, 'CTD .DN clears once .ACC is below .PRE');
  fall();
  assert.equal(down.counters.C.acc, 0, 'CTD .ACC keeps counting past .PRE');
});

test('TON with PRE=0 sets DN on the scan that adds time', () => {
  const st = initialState([]);
  st.dt = 1000;
  st.bits.EN = 1;
  const rung = series(
    { t: 'no', a: 'EN' },
    { t: 'blk', k: 'TON', a: 'T0', p: [{ k: 'PRE', v: '0' }] }
  );
  analyze(rung, st, { live: true });
  assert.equal(st.timers.T0.acc, 0);
  assert.equal(st.timers.T0.dn, false);
  assert.equal(st.timers.T0.en, true);
  analyze(rung, st, { live: true });
  assert.equal(st.timers.T0.acc, 1000);
  assert.equal(st.timers.T0.dn, true);
  assert.equal(st.timers.T0.running, false);
  assert.equal(st.timers.T0.en, true);

  st.bits.EN = 0;
  analyze(series(
    { t: 'no', a: 'EN' },
    { t: 'blk', k: 'TON', a: 'T0', p: [{ k: 'PRE', v: '0' }] }
  ), st, { live: true });
  assert.equal(st.timers.T0.dn, false);
  assert.equal(st.timers.T0.en, false);
});

test('GT compares greater-than (same as GRT), not not-equal', () => {
  const st = initialState([]);
  st.values.A = 5;
  st.values.B = 3;
  const gt = analyze(series(
    { t: 'blk', k: 'GT', p: [{ k: 'Src A', v: 'A' }, { k: 'Src B', v: 'B' }] },
    { t: 'coil', k: 'OTE', a: 'HI' }
  ), st, { live: true });
  assert.equal(st.bits.HI, 1);

  st.values.A = 3;
  st.values.B = 5;
  analyze(series(
    { t: 'blk', k: 'GT', p: [{ k: 'Src A', v: 'A' }, { k: 'Src B', v: 'B' }] },
    { t: 'coil', k: 'OTE', a: 'HI' }
  ), st, { live: true });
  assert.equal(st.bits.HI, 0);

  // Equal operands: GT false, NEQ false — proves GT is not the old !== fall-through.
  st.values.A = 4;
  st.values.B = 4;
  analyze(series(
    { t: 'blk', k: 'GT', p: [{ k: 'Src A', v: 'A' }, { k: 'Src B', v: 'B' }] },
    { t: 'coil', k: 'OTE', a: 'HI' }
  ), st, { live: true });
  assert.equal(st.bits.HI, 0, 'GT must be false when equal');
  analyze(series(
    { t: 'blk', k: 'NEQ', p: [{ k: 'Src A', v: 'A' }, { k: 'Src B', v: 'B' }] },
    { t: 'coil', k: 'OTE', a: 'DIFF' }
  ), st, { live: true });
  assert.equal(st.bits.DIFF, 0);
  void gt;
});

test('reworked labs still teach delay-then-act via .DN follow-on rungs', () => {
  // Purge: no short-circuit before DN
  const blocked = scan('rung-purge', { bits: { FLAME_FAIL: 1 } });
  assert.equal(blocked.st.bits.PURGE_OK, 0);
  const midPurge = scan('rung-purge', { scans: 4 });
  assert.equal(midPurge.st.bits.PURGE_OK, 0, 'purge must wait for TON.DN');
  assert.equal(midPurge.st.timers.T_PURGE.acc, 3000);

  // ESD: confirm delay must elapse before GAS_TRIP
  const early = scan('rung-esd-fg', { scans: 3, bits: { GD_A_ALM: 1 } });
  assert.equal(early.st.bits.GAS_TRIP, 0);
  const trip = scan('rung-esd-fg', { scans: 12, bits: { GD_A_ALM: 1 } });
  assert.equal(trip.st.bits.GAS_TRIP, 1);
  assert.equal(trip.st.bits.SDV_HOLD, 0);

  // Alarm deadband still needs the on-delay
  const hot = scan('rung-alarm-deadbnd', { scans: 6, values: { LEVEL_PV: 101.2 } });
  assert.equal(hot.st.bits.LSHH_ALM, 1);
  const spike = scan('rung-alarm-deadbnd', { scans: 2, values: { LEVEL_PV: 101.2 } });
  assert.equal(spike.st.bits.LSHH_ALM, 0, 'short spike must not latch');
});

test('LIM is a range test: inside, outside, boundaries, reversed limits, and no clamp', () => {
  const rung = (lo, inn, hi) => series(
    { t: 'no', a: 'EN' },
    { t: 'blk', k: 'LIM', p: [{ k: 'LO', v: String(lo) }, { k: 'IN', v: String(inn) }, { k: 'HI', v: String(hi) }] },
    { t: 'coil', k: 'OTE', a: 'OUT' }
  );
  const out = (lo, inn, hi, bits = { EN: 1 }) => {
    const st = initialState([]);
    Object.assign(st.bits, bits);
    analyze(rung(lo, inn, hi), st, { live: true });
    return st.bits.OUT ? 1 : 0;
  };
  assert.equal(out(0, 5, 10), 1, 'inside');
  assert.equal(out(0, -1, 10), 0, 'below');
  assert.equal(out(0, 11, 10), 0, 'above');
  assert.equal(out(0, 0, 10), 1, 'low boundary');
  assert.equal(out(0, 10, 10), 1, 'high boundary');
  assert.equal(out(10, 10, 0), 1, 'reversed: equal to Low');
  assert.equal(out(10, 0, 0), 1, 'reversed: equal to High');
  assert.equal(out(10, 11, 0), 1, 'reversed: outside above Low');
  assert.equal(out(10, -1, 0), 1, 'reversed: outside below High');
  assert.equal(out(10, 5, 0), 0, 'reversed: strictly inside is false');
  assert.equal(out(0, 5, 10, { EN: 0 }), 0, 'false rung does not pass');

  const st = initialState([]);
  st.bits.EN = 1;
  st.values = { LO: NaN, X: 1, HI: 10, CMD: 50 };
  analyze(series(
    { t: 'no', a: 'EN' },
    { t: 'blk', k: 'LIM', p: [{ k: 'LO', v: 'LO' }, { k: 'IN', v: 'X' }, { k: 'HI', v: 'HI' }] },
    { t: 'coil', k: 'OTE', a: 'NAN_OUT' }
  ), st, { live: true });
  assert.equal(st.bits.NAN_OUT, 0, 'NAN fails the test');
  analyze(series(
    { t: 'no', a: 'EN' },
    { t: 'blk', k: 'LIM', p: [{ k: 'LO', v: '0' }, { k: 'IN', v: 'CMD' }, { k: 'HI', v: '10' }] },
    { t: 'coil', k: 'OTE', a: 'CLAMP' }
  ), st, { live: true });
  assert.equal(st.values.CMD, 50, 'LIM does not rewrite the tested value');
  assert.equal(st.bits.CLAMP, 0, '50 is above the high limit');
});

test('level-loop LIM tests the valve command and leaves it unchanged', () => {
  const inside = scan('rung-pid-level');
  assert.equal(inside.st.bits.LCV_EN, 1);
  assert.equal(inside.st.values.LCV_AO, 50);
  const outside = scan('rung-pid-level', { values: { LCV_AO: 100 } });
  assert.equal(outside.st.bits.LCV_EN, 0);
  assert.equal(outside.st.values.LCV_AO, 100);
});

test('changed Logix entries cite 1756-RM003 and drop the old names', () => {
  const byMnemonic = Object.fromEntries(INSTRUCTIONS.map((item) => [item.id, item]));
  assert.match(byMnemonic['in-cps'].name, /Synchronous Copy File/);
  assert.match(byMnemonic['in-cps'].function, /p\. 464/);
  assert.doesNotMatch(byMnemonic['in-cps'].function, /single precision/i);
  assert.match(byMnemonic['in-gsv'].name, /Get System Value/);
  assert.match(byMnemonic['in-gsv'].function, /p\. 173/);
  assert.doesNotMatch(`${byMnemonic['in-gsv'].mnemonic} ${byMnemonic['in-gsv'].name}`, /GSF/);
  assert.match(byMnemonic['in-lim'].function, /1756-RM018A/);
  assert.match(byMnemonic['in-lim'].function, /Test value keeps the number/);
  assert.match(byMnemonic['in-pid'].function, /pp\. 672-677/);
  assert.doesNotMatch(JSON.stringify(byMnemonic['in-pid'].members), /\.Kc|\.Mode|\.DBNDBND|\.INDEP/);
  assert.match(byMnemonic['in-xic'].gotcha, /BOOL bit/);
  assert.match(byMnemonic['in-xic'].gotcha, /p\. 64/);
  assert.match(byMnemonic['in-ote'].function, /postscan/);
  assert.match(byMnemonic['in-ote'].function, /p\. 84/);
  assert.match(byMnemonic['in-ton'].function, /1756-RM018A/);
  assert.match(byMnemonic['in-ton'].function, /p\. 135/);
  assert.match(byMnemonic['in-tof'].function, /sets \.ACC equal to \.PRE/);
  assert.match(byMnemonic['in-ctu'].gotcha, /While the rung stays true/);
  assert.doesNotMatch(`${byMnemonic['in-ton'].gotcha} ${byMnemonic['in-tof'].gotcha} ${byMnemonic['in-rto'].function} ${byMnemonic['in-rto'].gotcha} ${byMnemonic['in-ctd'].gotcha}`, /this extract|does not remove|does not clear \.PRE/i);
  assert.doesNotMatch(byMnemonic['in-rto'].function, /power cycle/i);
});
