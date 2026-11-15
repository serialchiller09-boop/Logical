/**
 * Phase E1 — guided panel scenario packs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEntries, GUIDED_PANEL_SCENARIOS } from '../server/src/seed/index.js';
import { PANEL_SCENARIOS, panelScenarioHref } from '../web/src/data/panelScenarios.js';

const ENTRIES = buildEntries();
const byId = new Map(ENTRIES.map((e) => [e.id, e]));

test('guided pack has at least four scenarios with classroom meta', () => {
  assert.ok(GUIDED_PANEL_SCENARIOS.length >= 4, 'need ≥4 guided labs');
  const orders = new Set();
  for (const s of GUIDED_PANEL_SCENARIOS) {
    assert.ok(s.rungId && s.cardTitle, 'scenario needs rungId + cardTitle');
    assert.ok(Number.isInteger(s.order) && s.order >= 1, `${s.rungId}: order`);
    assert.ok(!orders.has(s.order), `${s.rungId}: duplicate order ${s.order}`);
    orders.add(s.order);
    assert.ok(Array.isArray(s.dockTags) && s.dockTags.length >= 2, `${s.rungId}: dockTags`);
    assert.ok(typeof s.scanHint === 'string' && s.scanHint.length >= 24, `${s.rungId}: scanHint`);
    assert.doesNotMatch(s.scanHint, /live field|real PLC runtime|graded|autograde/i, `${s.rungId}: hint must stay teaching-only`);
  }
});

test('each scenario maps to a seeded rung with goal, try-this, and matching dock tags', () => {
  for (const s of GUIDED_PANEL_SCENARIOS) {
    const id = `rungs:${s.rungId}`;
    const entry = byId.get(id);
    assert.ok(entry, `missing seeded entry ${id}`);
    assert.equal(entry.payload.panelScenario, true, `${id}: panelScenario flag`);
    assert.equal(entry.payload.scenarioCard, s.cardTitle);
    assert.equal(entry.payload.scenarioOrder, s.order);
    assert.deepEqual(entry.payload.dockTags, s.dockTags);
    assert.equal(entry.payload.scanHint, s.scanHint);
    const goal = entry.payload.goal || '';
    assert.ok(goal.length >= 24, `${id}: goal`);
    const steps = entry.payload.tryThis;
    assert.ok(Array.isArray(steps) && steps.length >= 2, `${id}: ≥2 tryThis steps`);

    const ioTags = new Set();
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj.io)) for (const p of obj.io) if (p?.tag) ioTags.add(p.tag);
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object' && v !== obj && Array.isArray(v.io)) walk(v);
      }
    };
    walk(entry.payload);
    for (const tag of s.dockTags) {
      assert.ok(ioTags.has(tag), `${id}: dockTag ${tag} not in rung I/O`);
    }
  }
});

test('Home pin list matches seed scenario ids and deep-links with dock=side', () => {
  assert.equal(PANEL_SCENARIOS.length, GUIDED_PANEL_SCENARIOS.length);
  const seedIds = new Set(GUIDED_PANEL_SCENARIOS.map((s) => `rungs:${s.rungId}`));
  for (const p of PANEL_SCENARIOS) {
    assert.ok(seedIds.has(p.entryId), `Home pin ${p.entryId} not in seed pack`);
    assert.ok(byId.has(p.entryId), `Home pin ${p.entryId} missing from buildEntries`);
    assert.match(panelScenarioHref(p.entryId), /\?dock=side$/);
    assert.match(panelScenarioHref(p.entryId), /^\/e\//);
  }
});

test('anchor labs seal-in, latch/ack, 2oo3, and timer lockout are in the pack', () => {
  const ids = new Set(GUIDED_PANEL_SCENARIOS.map((s) => s.rungId));
  for (const need of ['rung-seal-in', 'rung-latch-ack', 'rung-2oo3', 'rung-ton-lockout']) {
    assert.ok(ids.has(need), `pack missing ${need}`);
  }
});
