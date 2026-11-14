import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBusToBitsValues,
  clearTagBus,
  isCouplingEnabled,
  loadLinkedIo,
  loadTagBus,
  publishLinkedIo,
  publishSnapshot,
  setBit,
  setCouplingEnabled,
  setValue,
  subscribeTagBus
} from '../web/src/lib/tagBus.js';
import {
  applyBusToPanel,
  createPanelFromLadderIo,
  countByType,
  panelToBusSnapshot,
  setTag
} from '../web/src/lib/ioSandbox.js';

function withStorage(fn) {
  const mem = new Map();
  const orig = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); }
  };
  try { return fn(mem); }
  finally { globalThis.localStorage = orig; }
}

test('tag bus publishes bits/values and notifies subscribers', () => {
  withStorage(() => {
    clearTagBus();
    setCouplingEnabled(true);
    const seen = [];
    const unsub = subscribeTagBus((state, source) => seen.push({ source, bits: { ...state.bits } }));
    setBit('HMI_START', true, 'sandbox');
    setValue('LEVEL_PV', 42, 'sandbox');
    publishSnapshot({ bits: { LOP_RUN: 1 }, values: { LEVEL_PV: 50 } }, 'ladder');
    unsub();
    const bus = loadTagBus();
    assert.equal(bus.bits.HMI_START, 1);
    assert.equal(bus.bits.LOP_RUN, 1);
    assert.equal(bus.values.LEVEL_PV, 50);
    assert.ok(seen.some((e) => e.source === 'sandbox'));
    assert.ok(seen.some((e) => e.source === 'ladder'));
  });
});

test('coupling off leaves the bus unchanged on writes', () => {
  withStorage(() => {
    clearTagBus();
    setCouplingEnabled(true);
    setBit('SW_A', true, 'sandbox');
    setCouplingEnabled(false);
    assert.equal(isCouplingEnabled(), false);
    setBit('SW_A', false, 'sandbox');
    assert.equal(loadTagBus().bits.SW_A, 1);
    setCouplingEnabled(true);
  });
});

test('applyBusToBitsValues only overlays known sim tags', () => {
  const out = applyBusToBitsValues(
    { HMI_START: 0, OTHER: 1 },
    { LEVEL_PV: 0 },
    { bits: { HMI_START: 1, STRANGER: 1 }, values: { LEVEL_PV: 12 } }
  );
  assert.equal(out.bits.HMI_START, 1);
  assert.equal(out.bits.OTHER, 1);
  assert.equal(out.bits.STRANGER, undefined);
  assert.equal(out.values.LEVEL_PV, 12);
});

test('linked I/O round-trip and panel adopt build matching widgets', () => {
  withStorage(() => {
    publishLinkedIo({
      entryId: 'rungs:seal-in',
      title: 'Seal-in',
      io: [
        { tag: 'HMI_START', type: 'DI', addr: 'I:0.2', role: 'Operator start request (momentary)', initial: 0 },
        { tag: 'AUTO_MODE', type: 'DI', addr: 'I:0.1', role: 'Handswitch in AUTO', initial: 1 },
        { tag: 'LOP_RUN', type: 'DO', addr: 'O:0.0', role: 'Contactor coil', initial: 0 },
        { tag: 'LEVEL_PV', type: 'AI', addr: 'I:2.0', role: 'Separator level', initial: 10 }
      ]
    });
    const linked = loadLinkedIo();
    assert.equal(linked.io.length, 4);
    const panel = createPanelFromLadderIo(linked);
    assert.equal(panel.mode, 'ladder');
    const counts = countByType(panel);
    assert.equal(counts.pb, 1);
    assert.equal(counts.switch, 1);
    assert.equal(counts.led, 1);
    assert.equal(counts.pot, 1);
    assert.equal(panel.tags.AUTO_MODE, true);

    const next = setTag(panel, 'HMI_START', true);
    const snap = panelToBusSnapshot(next);
    assert.equal(snap.bits.HMI_START, 1);
    const overlaid = applyBusToPanel(panel, { bits: { LOP_RUN: 1 }, values: { LEVEL_PV: 77 } });
    assert.equal(overlaid.tags.LOP_RUN, true);
    assert.equal(overlaid.tags.LEVEL_PV, 77);
  });
});
