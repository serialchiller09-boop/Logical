import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRAINER_IO } from '../web/src/data/substationProject.js';
import {
  PANEL_VERSION,
  addWidget,
  countByType,
  createStarterPanel,
  createTrainerPanel,
  lampTest,
  normalizePanel,
  panelToCsv,
  removeWidget,
  setTag
} from '../web/src/lib/ioSandbox.js';

test('starter blank panel ships at least 10 LEDs plus switches, PBs and pots', () => {
  const panel = createStarterPanel();
  assert.equal(panel.version, PANEL_VERSION);
  assert.equal(panel.mode, 'blank');
  const counts = countByType(panel);
  assert.ok(counts.led >= 10, `expected ≥10 LEDs, got ${counts.led}`);
  assert.ok(counts.switch >= 4, 'starter should include maintained switches');
  assert.ok(counts.pb >= 2, 'starter should include momentary PBs');
  assert.ok(counts.pot >= 2, 'starter should include potentiometers');
  assert.equal(Object.keys(panel.tags).length, panel.widgets.length);
});

test('trainer preset mirrors SUB-TRAIN-01 TRAINER_IO counts and tags', () => {
  const panel = createTrainerPanel();
  assert.equal(panel.mode, 'trainer');
  const counts = countByType(panel);
  assert.equal(counts.led, TRAINER_IO.green.length + TRAINER_IO.amber.length);
  assert.equal(counts.switch, TRAINER_IO.maintained.length);
  assert.equal(counts.pb, TRAINER_IO.momentary.length);
  assert.equal(counts.pot, TRAINER_IO.analog.length);
  assert.equal(panel.widgets.length, 40);

  const tags = new Set(panel.widgets.map((w) => w.tag));
  for (const row of [...TRAINER_IO.green, ...TRAINER_IO.amber, ...TRAINER_IO.maintained, ...TRAINER_IO.momentary, ...TRAINER_IO.analog]) {
    assert.ok(tags.has(row.tag), `missing ${row.tag}`);
  }
  const healthy = panel.widgets.find((w) => w.tag === 'DI_ControlPowerHealthy');
  assert.equal(panel.tags.DI_ControlPowerHealthy, true, 'normal ON maintained inputs start true');
  assert.ok(healthy?.studio && healthy?.rslogix && healthy?.channel);

  const csv = panelToCsv(panel);
  assert.match(csv, /DO_LED_ControlHealthy/);
  assert.match(csv, /Local:4:O\.Data\.0/);
});

test('add / remove / setTag / lampTest keep the local tag table coherent', () => {
  let panel = createStarterPanel();
  const before = countByType(panel).led;
  panel = addWidget(panel, 'led', { label: 'EXTRA', color: 'red' });
  assert.equal(countByType(panel).led, before + 1);
  const extra = panel.widgets.find((w) => w.label === 'EXTRA');
  assert.ok(extra);
  assert.equal(panel.tags[extra.tag], false);

  panel = setTag(panel, extra.tag, true);
  assert.equal(panel.tags[extra.tag], true);

  panel = lampTest(panel, true);
  for (const w of panel.widgets.filter((x) => x.type === 'led')) {
    assert.equal(panel.tags[w.tag], true, `${w.tag} should be lit`);
  }
  panel = lampTest(panel, false);
  for (const w of panel.widgets.filter((x) => x.type === 'led')) {
    assert.equal(panel.tags[w.tag], false);
  }

  panel = removeWidget(panel, extra.id);
  assert.equal(countByType(panel).led, before);
  assert.equal(panel.tags[extra.tag], undefined);
});

test('normalizePanel recovers a usable starter from empty or broken storage', () => {
  const recovered = normalizePanel(null);
  assert.ok(countByType(recovered).led >= 10);
  const partial = normalizePanel({ version: 1, widgets: [{ type: 'led', tag: 'L1', label: 'One', color: 'green', x: 0, y: 0 }], tags: { L1: 1 } });
  assert.equal(partial.widgets.length, 1);
  assert.equal(partial.tags.L1, true);
  assert.equal(normalizePanel({ widgets: [{ type: 'nope' }] }).widgets.length >= 10, true);
});
