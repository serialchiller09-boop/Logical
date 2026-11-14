import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBusToBitsValues,
  clearTagBus,
  loadTagBus,
  publishSnapshot,
  setCouplingEnabled
} from '../web/src/lib/tagBus.js';
import {
  classifyLadderPoint,
  collectIoFromPayload,
  countByType,
  createPanelFromLadderIo
} from '../web/src/lib/ioSandbox.js';

test('collectIoFromPayload merges main and follow-on rung I/O uniquely', () => {
  const io = collectIoFromPayload({
    io: [
      { tag: 'HMI_START', type: 'DI' },
      { tag: 'LOP_RUN', type: 'DO' }
    ],
    followOn: {
      ladder: { t: 'coil', a: 'LOP_RUN' },
      io: [
        { tag: 'LOP_RUN', type: 'DO' },
        { tag: 'HMI_STOP', type: 'DI' }
      ]
    }
  });
  assert.equal(io.length, 3);
  assert.deepEqual(io.map((p) => p.tag).sort(), ['HMI_START', 'HMI_STOP', 'LOP_RUN']);
});

test('dock panel from rung I/O matches classifier (DI/PB/LED/pot)', () => {
  assert.equal(classifyLadderPoint({ tag: 'HMI_START', type: 'DI', role: 'Operator start request (momentary)' }).kind, 'pb');
  assert.equal(classifyLadderPoint({ tag: 'AUTO_MODE', type: 'DI', role: 'Handswitch in AUTO' }).kind, 'switch');
  assert.equal(classifyLadderPoint({ tag: 'LOP_RUN', type: 'DO', role: 'Contactor coil' }).kind, 'led');
  assert.equal(classifyLadderPoint({ tag: 'LEVEL_PV', type: 'AI', role: 'Separator level' }).kind, 'pot');

  const panel = createPanelFromLadderIo({
    entryId: 'rungs:demo',
    title: 'Demo',
    io: [
      { tag: 'HMI_START', type: 'DI', role: 'Operator start request (momentary)', initial: 0 },
      { tag: 'AUTO_MODE', type: 'DI', role: 'Handswitch in AUTO', initial: 1 },
      { tag: 'LOP_RUN', type: 'DO', role: 'Contactor coil', initial: 0 },
      { tag: 'LEVEL_PV', type: 'AI', role: 'Separator level', initial: 10 }
    ]
  });
  const counts = countByType(panel);
  assert.equal(counts.pb, 1);
  assert.equal(counts.switch, 1);
  assert.equal(counts.led, 1);
  assert.equal(counts.pot, 1);
});

test('dock publish to tag bus overlays sim bits for matching tags', () => {
  const mem = new Map();
  const orig = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); }
  };
  try {
    clearTagBus();
    setCouplingEnabled(true);
    publishSnapshot({ bits: { HMI_START: 1, LOP_RUN: 1 } }, 'dock');
    const bus = loadTagBus();
    const merged = applyBusToBitsValues(
      { HMI_START: 0, LOP_RUN: 0, OTHER: 1 },
      {},
      bus
    );
    assert.equal(merged.bits.HMI_START, 1);
    assert.equal(merged.bits.LOP_RUN, 1);
    assert.equal(merged.bits.OTHER, 1);
  } finally {
    globalThis.localStorage = orig;
  }
});
