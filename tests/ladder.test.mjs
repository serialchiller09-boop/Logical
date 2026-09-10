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

import {
  analyze, layout, initialState, collectElements, presetMs, resolveOperand, evalExpr
} from '../web/src/lib/ladder.js';
import { RUNGS } from '../server/src/seed/data/rungs.js';
import { RUNGS2 } from '../server/src/seed/data/rungs2.js';

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
  assert.equal(hot.st.timers.T_ALARM.acc, 5000, 'accumulation saturates at the preset');
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
  assert.equal(mid.st.timers.T_LOCK.acc, 60000);
  assert.equal(mid.st.bits.RESTART_BLOCK, 1, 'blocked while the delay runs');
  const done = scan('rung-ton-lockout', { scans: 130, bits: { TRIP_LAT: 1 } });
  assert.equal(done.st.timers.T_LOCK.dn, true);
  assert.equal(done.st.bits.RESTART_BLOCK, 0, 'released once the delay has elapsed');
  const cleared = scan('rung-ton-lockout', { scans: 60, bits: { TRIP_LAT: 0 } });
  assert.equal(cleared.st.timers.T_LOCK.acc, 0, 'a TON is non-retentive: the delay restarts from zero');
});

test('TOF: the output survives after the input falls, then drops at the preset', () => {
  const during = scan('rung-tof-cooldown', { scans: 100, bits: { MOTOR_RUNNING: 0 } });
  assert.equal(during.st.bits.FAN_RUN, 1, 'fan keeps running through the off-delay');
  assert.equal(during.st.timers.T_COOL.running, true);
  const after = scan('rung-tof-cooldown', { scans: 400, bits: { MOTOR_RUNNING: 0 } });
  assert.equal(after.st.bits.FAN_RUN, 0, 'fan stops when the delay expires');
  const whileRunning = scan('rung-tof-cooldown', { scans: 3, bits: { MOTOR_RUNNING: 1 } });
  assert.equal(whileRunning.st.timers.T_COOL.acc, 0, 'a running motor holds the off-delay at zero');
});

test('purge: the timer only runs with the permissives healthy, and the valve stays shut until purge ok', () => {
  const blocked = scan('rung-purge', { bits: { FLAME_FAIL: 1 } });
  assert.equal(blocked.st.timers.T_PURGE.running, false);
  assert.equal(blocked.st.bits.FG_SAFETY_OPEN, 0);
  const running = scan('rung-purge', { scans: 4 });
  assert.equal(running.st.timers.T_PURGE.acc, 4000);
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
  for (let i = 0; i < 12; i++) {
    st.bits.PUMP_SS = i % 2;
    st.bits['B3:3/7'] = i % 2;
    analyze(r.ladder, st, { live: true });
    analyze(r.ladder, st, { live: true });
  }
  assert.equal(st.counters['C5:0'].acc, 6, 'only real rising edges count');
  assert.equal(st.counters['C5:0'].dn, false, 'below target');
  st.values.TARGET = 5;
  st.bits.PUMP_SS = 0; st.bits['B3:3/7'] = 0;
  analyze(r.ladder, st, { live: true });
  st.bits.PUMP_SS = 1; st.bits['B3:3/7'] = 1;
  analyze(r.ladder, st, { live: true });
  assert.equal(st.counters['C5:0'].dn, true, 'target reached');
  assert.equal(st.bits.BATCH_DONE, 1);
  // the reset rung clears it
  st.bits.BATCH_START = 1;
  analyze(r.resetRung.ladder, st, { live: true });
  assert.equal(st.counters['C5:0'].acc, 0);
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
