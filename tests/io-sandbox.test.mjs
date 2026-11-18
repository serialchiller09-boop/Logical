import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAINER_IO } from '../web/src/data/substationProject.js';
import {
  PANEL_VERSION,
  addWidget,
  countByType,
  createStarterPanel,
  createTrainerPanel,
  lampTest,
  normalizePanel,
  formatOutputBit,
  normalizeLampColor,
  normalizeOutputView,
  outputViewLabel,
  panelPointsFromRoles,
  panelToCsv,
  removeWidget,
  setTag,
  assignInputKey,
  defaultInputKeys,
  isTextEntryTarget,
  releaseMomentaryBits,
  resolveInputSetup,
  toggledBit
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

test('editor tags map to sandbox switches and lamps, and a seal-in stays a lamp', () => {
  const points = panelPointsFromRoles({
    inputs: ['Start', 'Motor', 'Stop'],
    outputs: ['Motor'],
    duplicateOutputs: []
  }, { inputs: ['Start', 'Stop'], outputs: ['Motor'] });
  assert.deepEqual(points.inputs.map((point) => point.tag), ['Start', 'Stop']);
  assert.deepEqual(points.inputs.map((point) => point.type), ['switch', 'switch']);
  assert.deepEqual(points.outputs, [{ tag: 'Motor', type: 'led', kind: 'output' }]);
  assert.equal(points.inputs.every((point) => point.kind === 'input'), true);
});

test('input keys default to 1-9, and a custom key belongs to one input', () => {
  assert.deepEqual(defaultInputKeys(['Start', 'Stop', 'Lamp']), { Start: '1', Stop: '2', Lamp: '3' });
  const ten = Array.from({ length: 10 }, (_, index) => `In${index}`);
  assert.equal(defaultInputKeys(ten).In9, undefined);
  const moved = assignInputKey({ Stop: '2' }, 'Start', '2');
  assert.equal(moved.ok, true);
  assert.equal(moved.bindings.Start, '2');
  assert.equal(moved.bindings.Stop, undefined);
  assert.equal(assignInputKey({}, 'Start', 'Enter').ok, false);
  const setup = resolveInputSetup(['Start', 'Stop'], {}, moved.bindings);
  assert.equal(setup.bindings.Start, '2');
  assert.notEqual(setup.bindings.Stop, '2');
  assert.equal(isTextEntryTarget({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'INPUT', type: 'number' }), true);
  assert.equal(isTextEntryTarget({ tagName: 'BUTTON' }), false);
  assert.deepEqual(releaseMomentaryBits({ Start: 1, Stop: 1 }, { Start: 'pb', Stop: 'switch' }), { Start: 0, Stop: 1 });
});

test('a BOOL output is a lamp or the same 0 or 1 in decimal, hex, and binary', () => {
  assert.deepEqual(formatOutputBit(0, 'lamp'), { view: 'lamp', text: 'Off' });
  assert.deepEqual(formatOutputBit(1, 'lamp'), { view: 'lamp', text: 'On' });
  assert.deepEqual(formatOutputBit(1, 'decimal'), { view: 'decimal', text: '1' });
  assert.deepEqual(formatOutputBit(0, 'hex'), { view: 'hex', text: '0' });
  assert.deepEqual(formatOutputBit(1, 'binary'), { view: 'binary', text: '1' });
  assert.equal(formatOutputBit(1, 'float').view, 'lamp');
  assert.equal(normalizeOutputView('nope'), 'lamp');
  assert.equal(normalizeLampColor('red'), 'red');
  assert.equal(normalizeLampColor('blue'), 'green');
  assert.equal(outputViewLabel('hex'), 'Hex');

  const css = readFileSync(new URL('../web/src/styles.css', import.meta.url), 'utf8');
  const ink = css.match(/--ink:\s*(#[0-9a-fA-F]{6})/)[1];
  const face = css.match(/\.re-lamp[\s\S]*?background:\s*(#[0-9a-fA-F]{6})/)[1];
  const button = css.match(/--panel-3:\s*(#[0-9a-fA-F]{6})/)[1];
  assert.ok(contrast(ink, face) >= 4.5, `value text contrast ${contrast(ink, face)}`);
  assert.ok(contrast(ink, button) >= 4.5, `view button contrast ${contrast(ink, button)}`);
});

function contrast(fg, bg) {
  const lum = (hex) => {
    const n = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => {
      const c = parseInt(n.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const a = lum(fg);
  const b = lum(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

test('a maintained switch toggles 0 and 1 and does not invent a third state', () => {
  assert.equal(toggledBit({}, 'Start'), 1);
  assert.equal(toggledBit({ Start: 1 }, 'Start'), 0);
  assert.equal(toggledBit({ Start: 0 }, 'Start'), 1);
});

test('normalizePanel recovers a usable starter from empty or broken storage', () => {
  const recovered = normalizePanel(null);
  assert.ok(countByType(recovered).led >= 10);
  const partial = normalizePanel({ version: 1, widgets: [{ type: 'led', tag: 'L1', label: 'One', color: 'green', x: 0, y: 0 }], tags: { L1: 1 } });
  assert.equal(partial.widgets.length, 1);
  assert.equal(partial.tags.L1, true);
  assert.equal(normalizePanel({ widgets: [{ type: 'nope' }] }).widgets.length >= 10, true);
});
