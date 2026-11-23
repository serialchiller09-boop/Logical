/**
 * Guided panel scenario packs + beginner progressive path (seed content).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEntries,
  GUIDED_PANEL_SCENARIOS,
  PROGRESSIVE_PATH_LEVELS
} from '../server/src/seed/index.js';
import { PANEL_SCENARIOS, panelScenarioHref } from '../web/src/data/panelScenarios.js';
import {
  PROGRESSIVE_PATH_LEVELS as WEB_PATH,
  pathLevelHref
} from '../web/src/data/progressivePath.js';

const ENTRIES = buildEntries();
const byId = new Map(ENTRIES.map((e) => [e.id, e]));

function collectIoTags(payload) {
  const ioTags = new Set();
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.io)) for (const p of obj.io) if (p?.tag) ioTags.add(p.tag);
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object' && v !== obj) walk(v);
    }
  };
  walk(payload);
  return ioTags;
}

test('guided pack has classroom meta for each unique panel entry', () => {
  assert.ok(GUIDED_PANEL_SCENARIOS.length >= 5, 'need ≥5 guided labs (starters + cap bank)');
  const orders = new Set();
  for (const s of GUIDED_PANEL_SCENARIOS) {
    assert.ok(s.rungId && s.cardTitle, 'scenario needs rungId + cardTitle');
    assert.ok(typeof s.levelTitle === 'string' && s.levelTitle.length >= 4, `${s.rungId}: levelTitle`);
    assert.ok(Number.isInteger(s.order) && s.order >= 1, `${s.rungId}: order`);
    assert.ok(!orders.has(s.order), `${s.rungId}: duplicate order ${s.order}`);
    orders.add(s.order);
    assert.equal(s.pathLab, true, `${s.rungId}: pathLab`);
    assert.ok(Array.isArray(s.pathLevels) && s.pathLevels.length >= 1, `${s.rungId}: pathLevels`);
    assert.ok(Array.isArray(s.dockTags) && s.dockTags.length >= 2, `${s.rungId}: dockTags`);
    assert.ok(typeof s.scanHint === 'string' && s.scanHint.length >= 24, `${s.rungId}: scanHint`);
    assert.doesNotMatch(s.scanHint, /live field|real PLC runtime|graded|autograde/i, `${s.rungId}: hint must stay teaching-only`);
  }
});

test('progressive path has levels 1–8 with goal, ≥2 steps, and order', () => {
  assert.equal(PROGRESSIVE_PATH_LEVELS.length, 8, 'path must be eight levels');
  const levels = new Set();
  for (const l of PROGRESSIVE_PATH_LEVELS) {
    assert.ok(Number.isInteger(l.level) && l.level >= 1 && l.level <= 8, `bad level ${l.level}`);
    assert.ok(!levels.has(l.level), `duplicate path level ${l.level}`);
    levels.add(l.level);
    assert.ok(l.rungId && l.levelTitle && l.focusId, `level ${l.level}: rungId + levelTitle + focusId`);
    assert.equal(l.pathLab, true, `level ${l.level}: pathLab`);
    assert.ok(Array.isArray(l.dockTags) && l.dockTags.length >= 2, `level ${l.level}: dockTags`);
    assert.ok(typeof l.goal === 'string' && l.goal.length >= 24 && l.goal.length <= 140, `level ${l.level}: goal`);
    assert.ok(Array.isArray(l.tryThis) && l.tryThis.length >= 2, `level ${l.level}: ≥2 tryThis steps`);
    for (const step of l.tryThis) {
      assert.ok(typeof step === 'string' && step.length >= 12, `level ${l.level}: empty tryThis step`);
    }
    assert.ok(typeof l.scanHint === 'string' && l.scanHint.length >= 24, `level ${l.level}: scanHint`);
    assert.doesNotMatch(
      `${l.goal} ${l.scanHint} ${l.tryThis.join(' ')}`,
      /live field|real PLC runtime|graded|autograde/i,
      `level ${l.level}: copy must stay teaching-only`
    );
  }
  for (let n = 1; n <= 8; n++) assert.ok(levels.has(n), `missing path level ${n}`);
});

test('path level dock tags exist on the shared rung I/O', () => {
  for (const l of PROGRESSIVE_PATH_LEVELS) {
    const entry = byId.get(`rungs:${l.rungId}`);
    assert.ok(entry, `path level ${l.level}: missing entry rungs:${l.rungId}`);
    const ioTags = collectIoTags(entry.payload);
    for (const tag of l.dockTags) {
      assert.ok(ioTags.has(tag), `level ${l.level}: dockTag ${tag} not in rung I/O`);
    }
  }
});

test('cap bank is one entry with focus flags for levels 6–7–8 (not sibling copies)', () => {
  const capLevels = PROGRESSIVE_PATH_LEVELS.filter((l) => l.level >= 6);
  assert.equal(capLevels.length, 3);
  assert.ok(capLevels.every((l) => l.rungId === 'rung-cap-close'), 'levels 6–8 share rung-cap-close');
  const focuses = new Set(capLevels.map((l) => l.focusId));
  assert.deepEqual([...focuses].sort(), ['full-close', 'min-off', 'series-and']);

  const guided = GUIDED_PANEL_SCENARIOS.find((s) => s.rungId === 'rung-cap-close');
  assert.ok(guided, 'cap bank must be a guided panel scenario');
  assert.deepEqual(guided.pathLevels, [6, 7, 8]);
  assert.ok(Array.isArray(guided.pathFocuses) && guided.pathFocuses.length === 3, 'pathFocuses for 6–7–8');
  const focusIds = guided.pathFocuses.map((f) => f.focusId).sort();
  assert.deepEqual(focusIds, ['full-close', 'min-off', 'series-and']);
  assert.equal(GUIDED_PANEL_SCENARIOS.filter((s) => s.rungId === 'rung-cap-close').length, 1);
});

test('seal-in carries first-minute dock filter for level 1 (Start + Run lamp)', () => {
  const level1 = PROGRESSIVE_PATH_LEVELS.find((l) => l.level === 1);
  assert.ok(level1);
  assert.equal(level1.rungId, 'rung-seal-in');
  assert.equal(level1.focusId, 'first-minute');
  assert.deepEqual(level1.dockTags, ['HMI_START', 'LOP_RUN']);

  const seal = GUIDED_PANEL_SCENARIOS.find((s) => s.rungId === 'rung-seal-in');
  assert.ok(seal);
  assert.deepEqual(seal.firstMinuteDockTags, ['HMI_START', 'LOP_RUN']);
  assert.deepEqual(seal.pathLevels, [1, 2]);
});

test('each guided scenario maps to a seeded rung with goal, try-this, and matching dock tags', () => {
  for (const s of GUIDED_PANEL_SCENARIOS) {
    const id = `rungs:${s.rungId}`;
    const entry = byId.get(id);
    assert.ok(entry, `missing seeded entry ${id}`);
    assert.equal(entry.payload.panelScenario, true, `${id}: panelScenario flag`);
    assert.equal(entry.payload.pathLab, true, `${id}: pathLab`);
    assert.equal(entry.payload.scenarioCard, s.cardTitle);
    assert.equal(entry.payload.levelTitle, s.levelTitle);
    assert.equal(entry.payload.scenarioOrder, s.order);
    assert.deepEqual(entry.payload.dockTags, s.dockTags);
    assert.equal(entry.payload.scanHint, s.scanHint);
    if (s.firstMinuteDockTags) {
      assert.deepEqual(entry.payload.firstMinuteDockTags, s.firstMinuteDockTags);
    }
    if (s.pathFocuses) {
      assert.deepEqual(entry.payload.pathFocuses, s.pathFocuses);
    }
    const goal = entry.payload.goal || '';
    assert.ok(goal.length >= 24 && goal.length <= 140, `${id}: goal`);
    const steps = entry.payload.tryThis;
    assert.ok(Array.isArray(steps) && steps.length >= 2, `${id}: ≥2 tryThis steps`);

    const ioTags = collectIoTags(entry.payload);
    for (const tag of s.dockTags) {
      assert.ok(ioTags.has(tag), `${id}: dockTag ${tag} not in rung I/O`);
    }
  }
});

test('cap-bank entry goal states the close pulse win and that the timer is only a wait', () => {
  const entry = byId.get('rungs:rung-cap-close');
  assert.ok(entry);
  const goal = entry.payload.goal || '';
  assert.match(goal, /52C1/);
  assert.match(goal, /The wait lets residual charge decay/);
  assert.doesNotMatch(goal, /SIM_891A_Closed|SIM_891G_Open/);
  assert.equal(entry.payload.tryThis.length, 9);
});

test('Home unique-entry pins still match seed scenario ids', () => {
  assert.equal(PANEL_SCENARIOS.length, GUIDED_PANEL_SCENARIOS.length);
  const seedIds = new Set(GUIDED_PANEL_SCENARIOS.map((s) => `rungs:${s.rungId}`));
  for (const p of PANEL_SCENARIOS) {
    assert.ok(seedIds.has(p.entryId), `Home pin ${p.entryId} not in seed pack`);
    assert.ok(byId.has(p.entryId), `Home pin ${p.entryId} missing from buildEntries`);
    assert.ok(p.levelTitle || p.cardTitle, `${p.entryId}: title`);
    assert.match(panelScenarioHref(p.entryId), /\?dock=side$/);
    assert.match(panelScenarioHref(p.entryId), /^\/e\//);
  }
});

test('Home progressive path lists all eight levels with open deep-links', () => {
  assert.equal(WEB_PATH.length, 8);
  assert.equal(WEB_PATH.length, PROGRESSIVE_PATH_LEVELS.length);
  for (const l of WEB_PATH) {
    assert.ok(byId.has(`rungs:${l.rungId}`), `path level ${l.level} missing entry`);
    assert.match(pathLevelHref(l), /dock=(side|below)/);
    assert.match(pathLevelHref(l), new RegExp(`level=${l.level}`));
  }
});

test('anchor labs seal-in, latch/ack, 2oo3, timer lockout, and cap bank are in the pack', () => {
  const ids = new Set(GUIDED_PANEL_SCENARIOS.map((s) => s.rungId));
  for (const need of ['rung-seal-in', 'rung-latch-ack', 'rung-2oo3', 'rung-ton-lockout', 'rung-cap-close']) {
    assert.ok(ids.has(need), `pack missing ${need}`);
  }
});
