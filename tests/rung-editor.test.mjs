/**
 * Learner rung editor: model operations, validation wording, and scans through analyze().
 *
 *   node --test tests/rung-editor.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  analyze, initialState, EDITOR_GEO, LADDER_MIN_TAG_FONT_PX, blockBounds, frameLadder, fitRung, layout,
  scanLadders, LAB_DEFAULT_SCAN_MS
} from '../web/src/lib/ladder.js';
import { panelPointsFromRoles, toggledBit, inputKeyAction, nextInputBit, resolveInputSetup, formatDint } from '../web/src/lib/ioSandbox.js';
import {
  EDITOR_BRANCH_LIMIT_TEXT,
  EDITOR_RUN_INTERVAL_MS,
  EDITOR_SCAN_MS,
  EDITOR_STORAGE_KEY,
  addInstruction,
  addParallelBranch,
  addRung,
  applyEditorScan,
  editorNumberValues,
  editStepControl,
  imageFromBits,
  compileProgram,
  compileRung,
  createProgram,
  deleteInstruction,
  deleteLeg,
  deleteRung,
  loadProgram,
  previewEditor,
  resetStoredProgram,
  saveProgram,
  scanEditor,
  setInstructionTag,
  tagRoles,
  validateProgram
} from '../web/src/lib/rungEditor.js';

function must(result) {
  assert.equal(result.ok, true, result.error?.message || 'editor operation failed');
  return result;
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); }
  };
}

function addSeries(program, rungIndex, instructions) {
  let next = program;
  for (const instr of instructions) {
    const rungId = next.rungs[rungIndex].id;
    const res = must(addInstruction(next, { rungId, kind: instr.kind, tag: instr.tag, pre: instr.pre }));
    next = res.program;
  }
  return next;
}

function sealInProgram() {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'Start' }));
  program = res.program;
  res = must(addParallelBranch(program, { rungId, elementId: res.focusId }));
  program = res.program;
  assert.equal(res.selection.place, 'leg');
  assert.equal(res.selection.legIndex, 1);
  res = must(addInstruction(program, {
    rungId,
    kind: 'XIC',
    tag: 'Motor',
    place: 'leg',
    legIndex: res.selection.legIndex
  }));
  program = res.program;
  const branch = program.rungs[0].elements.find((el) => el.kind === 'branch');
  res = must(addInstruction(program, { rungId, kind: 'XIO', tag: 'Stop', place: 'series', afterId: branch.id }));
  program = res.program;
  res = must(addInstruction(program, { rungId, kind: 'OTE', tag: 'Motor' }));
  return res.program;
}

test('add and delete rungs, and the last rung clears instead of disappearing', () => {
  let program = createProgram();
  assert.equal(program.version, 1);
  assert.equal(program.rungs.length, 1);
  const first = program.rungs[0].id;

  const added = must(addRung(program, { afterRungId: first }));
  program = added.program;
  assert.equal(program.rungs.length, 2);
  assert.equal(program.rungs[0].id, first);
  assert.equal(program.rungs[1].id, added.selection.rungId);

  const removed = must(deleteRung(program, first));
  program = removed.program;
  assert.equal(program.rungs.length, 1);
  assert.equal(program.rungs[0].id, added.selection.rungId);

  const cleared = must(deleteRung(program, program.rungs[0].id));
  assert.equal(cleared.program.rungs.length, 1);
  assert.equal(cleared.program.rungs[0].elements.length, 0);
  assert.notEqual(cleared.program.rungs[0].id, program.rungs[0].id);
  assert.match(cleared.notice, /one empty rung/i);
});

test('add XIC, XIO, and OTE in series, edit a tag, and delete an instruction', () => {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'Start' }));
  program = res.program;
  const startId = res.focusId;
  res = must(addInstruction(program, { rungId, kind: 'XIO', tag: 'Stop', afterId: startId }));
  program = res.program;
  res = must(addInstruction(program, { rungId, kind: 'OTE', tag: 'Run' }));
  program = res.program;

  assert.deepEqual(compileRung(program.rungs[0]), {
    t: 'and',
    c: [
      { t: 'no', a: 'Start' },
      { t: 'nc', a: 'Stop' },
      { t: 'coil', k: 'OTE', a: 'Run' }
    ]
  });

  res = must(setInstructionTag(program, { rungId, elementId: startId, tag: 'Start_PB' }));
  program = res.program;
  assert.equal(compileRung(program.rungs[0]).c[0].a, 'Start_PB');

  res = must(deleteInstruction(program, { rungId, elementId: startId }));
  program = res.program;
  assert.deepEqual(compileRung(program.rungs[0]).c.map((node) => node.t), ['nc', 'coil']);
});

test('a contact added after the coil is placed before the OTE', () => {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'OTE', tag: 'Run' }));
  program = res.program;
  const oteId = res.focusId;
  res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'Start', afterId: oteId }));
  program = res.program;
  const tree = compileRung(program.rungs[0]);
  assert.deepEqual(tree.c.map((node) => node.t), ['no', 'coil']);
  assert.equal(validateProgram(program).some((err) => err.code === 'ote-not-last'), false);
});

test('add a parallel branch around a contact and refuse a nested branch or a second branch', () => {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'A' }));
  program = res.program;
  const contactA = res.focusId;
  res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'B', afterId: contactA }));
  program = res.program;
  const contactB = res.focusId;

  res = must(addParallelBranch(program, { rungId, elementId: contactA }));
  program = res.program;
  const branch = program.rungs[0].elements.find((el) => el.kind === 'branch');
  assert.equal(branch.legs[0][0].tag, 'A');
  assert.deepEqual(branch.legs[1], []);
  assert.equal(program.rungs[0].elements.some((el) => el.tag === 'B'), true);

  const nested = addParallelBranch(program, { rungId, elementId: branch.legs[0][0].id });
  assert.equal(nested.ok, false);
  assert.equal(nested.error.code, 'nested-branch');
  assert.match(nested.error.message, /one level deep/i);
  assert.equal(nested.program, program);

  const second = addParallelBranch(program, { rungId, elementId: contactB });
  assert.equal(second.ok, false);
  assert.equal(second.error.code, 'one-branch');
  assert.match(second.error.message, /one branch/i);

  const leg = must(addParallelBranch(program, { rungId, elementId: branch.id, addLeg: true }));
  assert.equal(leg.program.rungs[0].elements.find((el) => el.kind === 'branch').legs.length, 3);

  const removed = must(deleteLeg(leg.program, { rungId, branchId: branch.id, legIndex: 2 }));
  assert.equal(removed.program.rungs[0].elements.find((el) => el.kind === 'branch').legs.length, 2);

  const unwrapped = must(deleteLeg(removed.program, { rungId, branchId: branch.id, legIndex: 1 }));
  assert.equal(unwrapped.program.rungs[0].elements.some((el) => el.kind === 'branch'), false);
  assert.equal(unwrapped.program.rungs[0].elements.some((el) => el.tag === 'A'), true);
});

test('validation messages: blank tag, missing OTE, output before a contact, output inside a branch', () => {
  const blank = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: '' },
    { kind: 'OTE', tag: 'Run' }
  ]);
  const blankError = validateProgram(blank).find((err) => err.code === 'empty-tag');
  assert.ok(blankError);
  assert.match(blankError.message, /Rung 1/);
  assert.match(blankError.message, /blank name is not allowed/i);

  const open = addSeries(createProgram(), 0, [{ kind: 'XIC', tag: 'Start' }]);
  const openError = validateProgram(open).find((err) => err.code === 'output-required');
  assert.match(openError.message, /must end with an output on the right/);
  assert.match(openError.message, /OTE/);

  const mid = {
    version: 1,
    seq: 10,
    rungs: [{
      id: 'r1',
      elements: [
        { id: 'e1', kind: 'OTE', tag: 'Run' },
        { id: 'e2', kind: 'XIC', tag: 'Start' }
      ]
    }]
  };
  const midError = validateProgram(mid).find((err) => err.code === 'output-not-last');
  assert.match(midError.message, /last instruction/);
  assert.match(midError.message, /before a contact/);

  const inside = {
    version: 1,
    seq: 10,
    rungs: [{
      id: 'r1',
      elements: [
        {
          id: 'b1',
          kind: 'branch',
          legs: [
            [{ id: 'e1', kind: 'XIC', tag: 'Start' }],
            [{ id: 'e2', kind: 'OTE', tag: 'Run' }]
          ]
        }
      ]
    }]
  };
  const insideError = validateProgram(inside).find((err) => err.code === 'output-in-branch');
  assert.match(insideError.message, /cannot sit inside a parallel branch/);

  const badName = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: '1Start' },
    { kind: 'OTE', tag: 'Run' }
  ]);
  assert.match(validateProgram(badName).find((err) => err.code === 'bad-tag').message, /not a tag name this editor accepts/);

  const emptyLeg = createProgram();
  const rungId = emptyLeg.rungs[0].id;
  let res = must(addInstruction(emptyLeg, { rungId, kind: 'XIC', tag: 'Start' }));
  res = must(addParallelBranch(res.program, { rungId, elementId: res.focusId }));
  res = must(addInstruction(res.program, { rungId, kind: 'OTE', tag: 'Run' }));
  const legError = validateProgram(res.program).find((err) => err.code === 'empty-leg');
  assert.match(legError.message, /parallel leg 2 has no contact/);
});

test('editor page states the one-level branch limit and cites 1756-RM003', () => {
  assert.match(EDITOR_BRANCH_LIMIT_TEXT, /one level deep/i);
  assert.match(EDITOR_BRANCH_LIMIT_TEXT, /OTE/);
  const page = readFileSync(new URL('../web/src/pages/RungEditor.jsx', import.meta.url), 'utf8');
  assert.match(page, /EDITOR_BRANCH_LIMIT_TEXT/);
  assert.match(page, /1756-RM003/);
  assert.match(page, /aria-label="Add XIC"/);
  assert.match(page, /aria-label="Step one scan"/);
});

test('series XIC XIC OTE is an AND through analyze()', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'A' },
    { kind: 'XIC', tag: 'B' },
    { kind: 'OTE', tag: 'Q' }
  ]);
  const [tree] = compileProgram(program);
  assert.equal(tree.t, 'and');
  const off = scanEditor(program, [{ bits: { A: 1, B: 0 } }]);
  assert.equal(off.traces[0].conds[0], false);
  assert.equal(off.traces[0].bits.Q, 0);
  const on = scanEditor(program, [{ bits: { A: 1, B: 1 } }]);
  assert.equal(on.traces[0].conds[0], true);
  assert.equal(on.traces[0].bits.Q, 1);
  const dropped = scanEditor(program, [{ bits: { A: 0, B: 1 } }]);
  assert.equal(dropped.traces[0].bits.Q, 0);

  const st = initialState([]);
  st.bits.A = 1;
  st.bits.B = 1;
  assert.equal(analyze(tree, st, { live: true }).conducts, true);
  assert.equal(st.bits.Q, 1);
});

test('a parallel branch is an OR through analyze()', () => {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'A' }));
  program = res.program;
  res = must(addParallelBranch(program, { rungId, elementId: res.focusId }));
  program = res.program;
  res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'B', place: 'leg', legIndex: 1 }));
  program = res.program;
  res = must(addInstruction(program, { rungId, kind: 'OTE', tag: 'Q' }));
  program = res.program;

  const tree = compileRung(program.rungs[0]);
  assert.equal(tree.c[0].t, 'or');
  assert.equal(tree.c[0].c.length, 2);

  const none = scanEditor(program, [{ bits: { A: 0, B: 0 } }]);
  assert.equal(none.traces[0].bits.Q, 0);
  const left = scanEditor(program, [{ bits: { A: 1, B: 0 } }]);
  assert.equal(left.traces[0].bits.Q, 1);
  assert.equal(left.traces[0].conds[0], true);
  const right = scanEditor(program, [{ bits: { A: 0, B: 1 } }]);
  assert.equal(right.traces[0].bits.Q, 1);
});

test('XIO is true when the bit is 0 and false when the bit is 1', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIO', tag: 'Stop' },
    { kind: 'OTE', tag: 'Run' }
  ]);
  assert.equal(compileRung(program.rungs[0]).c[0].t, 'nc');
  const released = scanEditor(program, [{ bits: { Stop: 0 } }]);
  assert.equal(released.traces[0].conds[0], true);
  assert.equal(released.traces[0].bits.Run, 1);
  const pressed = scanEditor(program, [{ bits: { Stop: 1 } }]);
  assert.equal(pressed.traces[0].conds[0], false);
  assert.equal(pressed.traces[0].bits.Run, 0);
});

test('seal-in holds across scans, then drops on Stop and stays off', () => {
  const program = sealInProgram();
  assert.deepEqual(compileRung(program.rungs[0]), {
    t: 'and',
    c: [
      {
        t: 'or',
        c: [
          { t: 'and', c: [{ t: 'no', a: 'Start' }] },
          { t: 'and', c: [{ t: 'no', a: 'Motor' }] }
        ]
      },
      { t: 'nc', a: 'Stop' },
      { t: 'coil', k: 'OTE', a: 'Motor' }
    ]
  });
  const roles = tagRoles(program);
  assert.deepEqual(roles.inputs, ['Start', 'Stop']);
  assert.deepEqual(roles.outputs, ['Motor']);

  const { traces } = scanEditor(program, [
    { bits: { Start: 1, Stop: 0 } },
    { bits: { Start: 0 } },
    { bits: { Stop: 1 } },
    { bits: { Stop: 0, Start: 0 } }
  ]);
  assert.equal(traces[0].bits.Motor, 1, 'start writes the coil');
  assert.equal(traces[0].conds[0], true);
  assert.equal(traces[1].bits.Start, 0);
  assert.equal(traces[1].bits.Motor, 1, 'seal-in holds after Start is released');
  assert.equal(traces[1].conds[0], true);
  assert.equal(traces[2].bits.Motor, 0, 'Stop opens the XIO and drops the coil');
  assert.equal(traces[2].conds[0], false);
  assert.equal(traces[3].bits.Stop, 0);
  assert.equal(traces[3].bits.Motor, 0, 'releasing Stop does not restart the motor');
  assert.equal(traces[3].conds[0], false);
});

test('double-coil: the later OTE in scan order wins', () => {
  let program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'A' },
    { kind: 'OTE', tag: 'Q' }
  ]);
  program = must(addRung(program)).program;
  program = addSeries(program, 1, [
    { kind: 'XIC', tag: 'B' },
    { kind: 'OTE', tag: 'Q' }
  ]);
  assert.deepEqual(tagRoles(program).duplicateOutputs, ['Q']);

  const { traces } = scanEditor(program, [
    { bits: { A: 1, B: 0 } },
    { bits: { A: 0, B: 1 } },
    { bits: { A: 1, B: 1 } },
    { bits: { A: 0, B: 0 } }
  ]);
  assert.equal(traces[0].conds[0], true, 'the first rung conducts');
  assert.equal(traces[0].conds[1], false, 'the second rung is open');
  assert.equal(traces[0].bits.Q, 0, 'the lower OTE clears the bit');
  assert.equal(traces[1].bits.Q, 1);
  assert.equal(traces[2].bits.Q, 1);
  assert.equal(traces[3].bits.Q, 0);

  let flipped = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'B' },
    { kind: 'OTE', tag: 'Q' }
  ]);
  flipped = must(addRung(flipped)).program;
  flipped = addSeries(flipped, 1, [
    { kind: 'XIC', tag: 'A' },
    { kind: 'OTE', tag: 'Q' }
  ]);
  const lowerWins = scanEditor(flipped, [{ bits: { A: 1, B: 0 } }]);
  assert.equal(lowerWins.traces[0].bits.Q, 1, 'swapping rung order swaps which OTE remains');
});

test('preview draws conduction without writing the OTE bit', () => {
  const program = sealInProgram();
  const bits = { Start: 1, Stop: 0 };
  const preview = previewEditor(program, bits);
  assert.equal(preview.conds[0], true);
  assert.equal(preview.bits.Motor ?? 0, 0);
  assert.equal(bits.Motor, undefined);
  assert.equal(preview.ladders[0].t, 'and');
  assert.ok(preview.maps[0].get(preview.ladders[0]));

  const state = initialState([]);
  state.bits = { Start: 1, Stop: 0 };
  const live = applyEditorScan(program, state);
  assert.equal(live.ok, true);
  assert.equal(state.bits.Motor, 1);
});

test('a program with a blank tag is not scanned', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: '' },
    { kind: 'OTE', tag: 'Run' }
  ]);
  assert.throws(() => scanEditor(program, [{ bits: {} }]), /blank name is not allowed/);
  const refused = applyEditorScan(program, initialState([]));
  assert.equal(refused.ok, false);
  assert.equal(refused.errors[0].code, 'empty-tag');
});

test('editor geometry ties the coil to the right rail and fits a 375px canvas', () => {
  const ladder = compileRung(sealInProgram().rungs[0]);
  const frame = frameLadder(layout(ladder, null, EDITOR_GEO), { geo: EDITOR_GEO });
  const coil = frame.items.find((it) => it.node.t === 'coil');
  const coilRight = coil.x + coil.w;
  assert.equal(frame.outputWire.x1, coilRight, 'the output wire starts at the coil');
  assert.equal(frame.outputWire.x2, frame.rightRail, 'the output wire ends at the right rail');
  assert.equal(frame.rightRail - coilRight, EDITOR_GEO.railPad);
  assert.ok(frame.items.some((it) => it.node.t === 'no' && it.node.a === 'Start'));
  assert.ok(frame.items.some((it) => it.node.t === 'nc' && it.node.a === 'Stop'));
  // Page pad 16, card pad 15, card border 1, each side. The rung must fit this canvas.
  const phoneCanvas = 375 - (16 + 15 + 1) * 2;
  const fit = fitRung(frame.w, phoneCanvas);
  assert.ok(fit.tagFontPx >= LADDER_MIN_TAG_FONT_PX);
  if (fit.scrolls) assert.ok(fit.renderWidth > phoneCanvas);
  else assert.ok(fit.renderWidth <= phoneCanvas + 0.01);

  const wide = addSeries(createProgram(), 0, [
    ...Array.from({ length: 8 }, (_, i) => ({ kind: 'XIC', tag: `In${i}` })),
    { kind: 'OTE', tag: 'Out' }
  ]);
  const wideFrame = frameLadder(layout(compileRung(wide.rungs[0]), null, EDITOR_GEO), { geo: EDITOR_GEO });
  const wideFit = fitRung(wideFrame.w, phoneCanvas);
  assert.equal(wideFit.scrolls, true);
  assert.equal(wideFit.tagFontPx, LADDER_MIN_TAG_FONT_PX);
});

test('a version-1 save without timers still loads and scans', () => {
  const storage = memoryStorage();
  storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify({
    version: 1,
    seq: 8,
    rungs: [{
      id: 'r1',
      elements: [
        { id: 'e1', kind: 'XIC', tag: 'Start' },
        { id: 'e2', kind: 'OTE', tag: 'Motor' }
      ]
    }]
  }));
  const loaded = loadProgram(storage);
  assert.equal(loaded.version, 1);
  assert.equal(loaded.rungs[0].elements.map((el) => el.kind).join(','), 'XIC,OTE');
  assert.equal(scanEditor(loaded, [{ bits: { Start: 1 } }]).traces[0].bits.Motor, 1);
});

test('OTL holds when its rung is false, and OTU clears only when its rung is true', () => {
  let program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'OTL', tag: 'Motor' }
  ]);
  program = must(addRung(program)).program;
  program = addSeries(program, 1, [
    { kind: 'XIC', tag: 'Stop' },
    { kind: 'OTU', tag: 'Motor' }
  ]);
  const { traces } = scanEditor(program, [
    { bits: { Start: 1, Stop: 0 } },
    { bits: { Start: 0, Stop: 0 } },
    { bits: { Stop: 1 } },
    { bits: { Stop: 0 } }
  ]);
  assert.equal(traces[0].bits.Motor, 1);
  assert.equal(traces[1].bits.Motor, 1, 'Output Latch does nothing when rung-condition-in is false');
  assert.equal(traces[2].bits.Motor, 0);
  assert.equal(traces[3].bits.Motor, 0, 'Output Unlatch does nothing when rung-condition-in is false');
});

test('a seal-in drops when the rung is false; a latch keeps the bit', () => {
  const sealed = scanEditor(sealInProgram(), [
    { bits: { Start: 1, Stop: 0 } },
    { bits: { Start: 0, Stop: 0 } },
    { bits: { Start: 0, Stop: 1 } }
  ]);
  assert.equal(sealed.traces[1].bits.Motor, 1, 'seal-in holds after Start is released');
  assert.equal(sealed.traces[2].bits.Motor, 0, 'OTE writes 0 when the rung is false');

  let latch = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'OTL', tag: 'Motor' }
  ]);
  latch = must(addRung(latch)).program;
  latch = addSeries(latch, 1, [
    { kind: 'XIC', tag: 'Stop' },
    { kind: 'OTU', tag: 'Motor' }
  ]);
  const held = scanEditor(latch, [
    { bits: { Start: 1, Stop: 0 } },
    { bits: { Start: 0, Stop: 0 } }
  ]);
  assert.equal(held.traces[1].bits.Motor, 1, 'OTL keeps the bit with Start released and no OTU');
});

test('TON reaches DN in 100 ms steps and clears when the rung is false', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Run' },
    { kind: 'TON', tag: 'T_Delay', pre: 500 }
  ]);
  const on = scanEditor(program, Array.from({ length: 5 }, () => ({ bits: { Run: 1 } })));
  assert.equal(on.traces[0].timers.T_Delay.acc, 100);
  assert.equal(on.traces[0].timers.T_Delay.en, true);
  assert.equal(on.traces[0].timers.T_Delay.running, true);
  assert.equal(on.traces[0].timers.T_Delay.dn, false);
  assert.equal(on.traces[4].timers.T_Delay.acc, 500);
  assert.equal(on.traces[4].timers.T_Delay.dn, true);
  assert.equal(on.traces[4].timers.T_Delay.running, false);
  const cleared = scanEditor(program, [
    { bits: { Run: 1 } },
    { bits: { Run: 1 } },
    { bits: { Run: 0 } }
  ]);
  assert.equal(cleared.traces[2].timers.T_Delay.acc, 0);
  assert.equal(cleared.traces[2].timers.T_Delay.dn, false);
  assert.equal(cleared.traces[2].timers.T_Delay.en, false);
  assert.equal(cleared.traces[2].timers.T_Delay.running, false);
});

test('TOF times while the rung is false and clears DN when ACC reaches PRE', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Run' },
    { kind: 'TOF', tag: 'T_Off', pre: 300 }
  ]);
  const { traces } = scanEditor(program, [
    { bits: { Run: 1 } },
    { bits: { Run: 0 } },
    { bits: { Run: 0 } },
    { bits: { Run: 0 } }
  ]);
  assert.equal(traces[0].timers.T_Off.acc, 0);
  assert.equal(traces[0].timers.T_Off.en, true);
  assert.equal(traces[0].timers.T_Off.dn, true);
  assert.equal(traces[0].timers.T_Off.running, false);
  assert.equal(traces[1].timers.T_Off.acc, 100);
  assert.equal(traces[1].timers.T_Off.dn, true);
  assert.equal(traces[1].timers.T_Off.running, true);
  assert.equal(traces[1].timers.T_Off.en, false);
  assert.equal(traces[3].timers.T_Off.acc, 300);
  assert.equal(traces[3].timers.T_Off.dn, false);
  assert.equal(traces[3].timers.T_Off.running, false);
});

test('CTU counts one rising edge when the input is held, and RES clears it', () => {
  let program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Part' },
    { kind: 'CTU', tag: 'C_Parts', pre: 3 }
  ]);
  program = must(addRung(program)).program;
  program = addSeries(program, 1, [
    { kind: 'XIC', tag: 'Reset' },
    { kind: 'RES', tag: 'C_Parts' }
  ]);
  const held = scanEditor(program, [
    { bits: { Part: 1, Reset: 0 } },
    { bits: { Part: 1 } },
    { bits: { Part: 1 } },
    { bits: { Part: 0 } },
    { bits: { Part: 1 } }
  ]);
  assert.equal(held.traces[0].counters.C_Parts.acc, 0, 'prescan .CU blocks an input that is already true');
  assert.equal(held.traces[2].counters.C_Parts.acc, 0, 'holding that first true does not count');
  assert.equal(held.traces[4].counters.C_Parts.acc, 1, 'the next false-to-true counts once');
  assert.equal(held.traces[4].counters.C_Parts.dn, false);

  const done = scanEditor(program, [
    { bits: { Part: 0, Reset: 0 } },
    { bits: { Part: 1 } },
    { bits: { Part: 0 } },
    { bits: { Part: 1 } },
    { bits: { Part: 0 } },
    { bits: { Part: 1 } }
  ]);
  assert.equal(done.traces[5].counters.C_Parts.acc, 3);
  assert.equal(done.traces[5].counters.C_Parts.dn, true);

  const reset = scanEditor(program, [
    { bits: { Part: 0, Reset: 0 } },
    { bits: { Part: 1, Reset: 0 } },
    { bits: { Part: 0, Reset: 1 } }
  ]);
  assert.equal(reset.traces[1].counters.C_Parts.acc, 1);
  assert.equal(reset.traces[2].counters.C_Parts.acc, 0);
  assert.equal(reset.traces[2].counters.C_Parts.dn, false);
  assert.equal(reset.traces[2].counters.C_Parts.cu, false);

  let followed = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Run' },
    { kind: 'TON', tag: 'T_Delay', pre: 200 }
  ]);
  followed = must(addRung(followed)).program;
  followed = addSeries(followed, 1, [
    { kind: 'XIC', tag: 'T_Delay.DN' },
    { kind: 'OTE', tag: 'Done' }
  ]);
  const lit = scanEditor(followed, [
    { bits: { Run: 1 } },
    { bits: { Run: 1 } }
  ]);
  assert.equal(lit.traces[0].bits.Done, 0);
  assert.equal(lit.traces[1].timers.T_Delay.dn, true);
  assert.equal(lit.traces[1].bits.Done, 1);
});

test('CTU prescan leaves ACC at 0 when the input is already true, then counts the next rising edge', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Part' },
    { kind: 'CTU', tag: 'C_Parts', pre: 3 }
  ]);
  const { traces } = scanEditor(program, [
    { bits: { Part: 1 } },
    { bits: { Part: 1 } },
    { bits: { Part: 0 } },
    { bits: { Part: 1 } },
    { bits: { Part: 1 } }
  ]);
  assert.equal(traces[0].counters.C_Parts.acc, 0);
  assert.equal(traces[0].counters.C_Parts.cu, true);
  assert.equal(traces[1].counters.C_Parts.acc, 0);
  assert.equal(traces[2].counters.C_Parts.cu, false);
  assert.equal(traces[3].counters.C_Parts.acc, 1);
  assert.equal(traces[4].counters.C_Parts.acc, 1, 'holding the rung true after the edge does not count again');
});

test('lab and editor CTU counts match, including an input that is already true and after Reset', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Part' },
    { kind: 'CTU', tag: 'C_Parts', pre: 3 }
  ]);
  const steps = [
    { bits: { Part: 1 } },
    { bits: { Part: 1 } },
    { bits: { Part: 0 } },
    { bits: { Part: 1 } },
    { bits: { Part: 1 } }
  ];
  const editor = scanEditor(program, steps);
  const labState = initialState([]);
  const ladders = compileProgram(program);
  const lab = [];
  for (const step of steps) {
    for (const [tag, value] of Object.entries(step.bits)) labState.bits[tag] = value ? 1 : 0;
    scanLadders(ladders, labState);
    lab.push({ acc: labState.counters.C_Parts.acc, cu: !!labState.counters.C_Parts.cu });
  }
  editor.traces.forEach((trace, index) => {
    assert.equal(lab[index].acc, trace.counters.C_Parts.acc, `step ${index} acc`);
    assert.equal(lab[index].cu, !!trace.counters.C_Parts.cu, `step ${index} cu`);
  });
  assert.equal(lab[0].acc, 0, 'already-true input does not count on the first scan');
  assert.equal(lab[3].acc, 1, 'the next false-to-true edge counts');

  const again = scanEditor(program, [{ bits: { Part: 1 } }]);
  const resetLab = initialState([]);
  resetLab.bits.Part = 1;
  scanLadders(ladders, resetLab);
  assert.equal(resetLab.counters.C_Parts.acc, 0);
  assert.equal(resetLab.counters.C_Parts.acc, again.traces[0].counters.C_Parts.acc);
});

test('an output view does not change the scan time, the prescan path, or a key toggle', () => {
  assert.equal(EDITOR_SCAN_MS, 100);
  assert.equal(EDITOR_RUN_INTERVAL_MS, 500);
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Switch' },
    { kind: 'OTE', tag: 'Lamp' }
  ]);
  const state = imageFromBits({});
  state.bits.Switch = toggledBit(state.bits, 'Switch');
  applyEditorScan(program, state);
  assert.equal(state.bits.Lamp, 1);
  assert.equal(formatDint(state.bits.Lamp, 'hex').text, '16#0000_0001');
  assert.equal(state.bits.Lamp, 1);
  const page = readFileSync(new URL('../web/src/pages/RungEditor.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /This is not a Logix DINT/);
  assert.match(page, /On means the bit is 1/);
  assert.match(page, /applyEditorScan/);
  assert.match(page, /inputKeyAction/);
  assert.match(page, /min-width: 421px/);
});

test('timer and counter .PRE and .ACC are the values the number view formats', () => {
  let program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'TON', tag: 'T_Delay', pre: 2000 }
  ]);
  const rungId = program.rungs[0].id;
  program = must(addRung(program, { afterRungId: rungId })).program;
  program = addSeries(program, 1, [
    { kind: 'XIC', tag: 'Part' },
    { kind: 'CTU', tag: 'C_Parts', pre: 5 }
  ]);
  const before = editorNumberValues(program, imageFromBits({}));
  assert.deepEqual(before.map((item) => [item.tag, item.kind, item.pre, item.acc]), [
    ['T_Delay', 'TON', 2000, 0],
    ['C_Parts', 'CTU', 5, 0]
  ]);
  const state = imageFromBits({ Start: 1 });
  for (let n = 0; n < 5; n += 1) applyEditorScan(program, state);
  const after = editorNumberValues(program, state);
  const timer = after.find((item) => item.tag === 'T_Delay');
  assert.equal(timer.acc, 500);
  assert.equal(timer.pre, 2000);
  assert.equal(formatDint(timer.acc, 'hex').text, '16#0000_01F4');
  assert.equal(formatDint(timer.pre, 'decimal').text, '2000');
  assert.ok(timer.acc >= 0);
});

test('a switch toggle feeds the next editor scan and the lamp follows OTE', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Switch' },
    { kind: 'OTE', tag: 'Lamp' }
  ]);
  const points = panelPointsFromRoles(tagRoles(program));
  assert.deepEqual(points.inputs.map((point) => point.tag), ['Switch']);
  assert.equal(points.inputs[0].type, 'switch');
  assert.deepEqual(points.outputs.map((point) => point.tag), ['Lamp']);
  assert.equal(points.outputs[0].type, 'led');

  const state = imageFromBits({});
  state.bits.Switch = toggledBit(state.bits, 'Switch');
  applyEditorScan(program, state);
  assert.equal(state.bits.Switch, 1);
  assert.equal(state.bits.Lamp, 1);
  state.bits.Switch = toggledBit(state.bits, 'Switch');
  applyEditorScan(program, state);
  assert.equal(state.bits.Switch, 0);
  assert.equal(state.bits.Lamp, 0);
});

test('on Edit, Step scans a switch into the lamp and errors disable Step', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Switch' },
    { kind: 'OTE', tag: 'Lamp' }
  ]);
  const ready = editStepControl(validateProgram(program));
  assert.equal(ready.disabled, false);
  assert.equal(ready.reason, '');

  const state = imageFromBits({});
  state.bits.Switch = toggledBit(state.bits, 'Switch');
  const scanned = applyEditorScan(program, state);
  assert.equal(scanned.ok, true);
  assert.equal(state.bits.Switch, 1);
  assert.equal(state.bits.Lamp, 1);

  const blocked = editStepControl(validateProgram(createProgram()));
  assert.equal(blocked.disabled, true);
  assert.equal(blocked.reason, 'Step is off until this program can be scanned.');
  const refused = applyEditorScan(createProgram(), imageFromBits({ Switch: 1 }));
  assert.equal(refused.ok, false);

  const page = readFileSync(new URL('../web/src/pages/RungEditor.jsx', import.meta.url), 'utf8');
  const panel = page.slice(page.indexOf('function IoPanel'));
  assert.match(panel, /mode === 'edit'/);
  assert.match(panel, /aria-label="Step one scan"/);
  assert.match(panel, /disabled=\{scanDisabled\}/);
  assert.match(panel, /re-edit-step-reason/);
  assert.match(panel, /Press Step one scan, beside the switches/);
  assert.match(panel, /Press Step one scan, or Start, on this tab/);
  assert.match(page, /onStep=\{stepOnce\}/);
  assert.match(page, /editStepControl\(errors\)/);
  assert.match(page, /min-width: 421px/);
  assert.match(page, /A momentary input is seen only when a scan runs while it is held/);
  assert.match(page, /EDITOR_RUN_INTERVAL_MS/);
  assert.match(page, /onPointerUp/);
  assert.match(page, /onPointerCancel/);
  assert.match(page, /onPointerLeave/);
  assert.match(page, /aria-pressed=\{on\}/);
});

test('a held momentary input is seen by applyEditorScan, and release, repeat, and text fields are ignored', () => {
  const program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'OTE', tag: 'Lamp' }
  ]);
  const setup = resolveInputSetup(['Start', 'Stop'], { Start: 'pb' }, {});
  assert.equal(setup.modes.Start, 'pb');
  assert.equal(setup.modes.Stop, 'switch');
  assert.equal(setup.bindings.Start, '1');
  assert.equal(setup.bindings.Stop, '2');

  const body = { tagName: 'BODY' };
  const field = { tagName: 'INPUT', type: 'text' };
  const down = inputKeyAction({ type: 'keydown', key: '1', repeat: false, target: body }, setup);
  assert.deepEqual(down, { tag: 'Start', action: 'press' });
  assert.equal(inputKeyAction({ type: 'keydown', key: '1', repeat: true, target: body }, setup), null);
  assert.equal(inputKeyAction({ type: 'keydown', key: '1', repeat: false, target: field }, setup), null);
  assert.equal(inputKeyAction({ type: 'keydown', key: '1', repeat: false, ctrlKey: true, target: body }, setup), null);
  assert.equal(inputKeyAction({ type: 'keydown', key: '1', repeat: false, metaKey: true, target: body }, setup), null);
  assert.equal(inputKeyAction({ type: 'keydown', key: '1', repeat: false, altKey: true, target: body }, setup), null);

  const state = imageFromBits({});
  state.bits.Start = nextInputBit(state.bits, down);
  const seen = applyEditorScan(program, state);
  assert.equal(seen.ok, true);
  assert.equal(state.bits.Start, 1);
  assert.equal(state.bits.Lamp, 1);

  const upInField = inputKeyAction({ type: 'keyup', key: '1', target: field }, setup);
  assert.deepEqual(upInField, { tag: 'Start', action: 'release' });
  state.bits.Start = nextInputBit(state.bits, upInField);
  applyEditorScan(program, state);
  assert.equal(state.bits.Start, 0);
  assert.equal(state.bits.Lamp, 0);

  const maintained = inputKeyAction({ type: 'keydown', key: '2', repeat: false, target: body }, setup);
  assert.deepEqual(maintained, { tag: 'Stop', action: 'toggle' });
  assert.equal(inputKeyAction({ type: 'keyup', key: '2', target: body }, setup), null);
  assert.equal(nextInputBit({}, maintained), 1);
  assert.equal(nextInputBit({ Stop: 1 }, maintained), 0);
});

test('the lab default step stays 1 s and says so next to the controls', () => {
  assert.equal(LAB_DEFAULT_SCAN_MS, 1000);
  const page = readFileSync(new URL('../web/src/components/RungDiagram.jsx', import.meta.url), 'utf8');
  assert.match(page, /Each step adds/);
  assert.match(page, /The default is 1 s/);
  assert.match(page, /rung editor adds 100 ms/);
  assert.match(page, /Output Energize prescan and postscan are not simulated/);
  assert.match(page, /Count Down prescan sets \.CD true/);
});

test('a timer or counter block title stays inside the rung frame', () => {
  const pins = [
    { k: 'PRE', v: '500' },
    { k: 'ACC', v: '0' },
    { k: 'EN', v: '' },
    { k: 'TT', v: '' },
    { k: 'DN', v: '' }
  ];
  const ton = {
    t: 'and',
    c: [
      { t: 'no', a: 'Run' },
      { t: 'blk', k: 'TON', a: 'T_Delay', p: pins }
    ]
  };
  const ctu = {
    t: 'and',
    c: [
      { t: 'no', a: 'Part' },
      { t: 'blk', k: 'CTU', a: 'C_Parts', p: [
        { k: 'PRE', v: '3' },
        { k: 'ACC', v: '0' },
        { k: 'CU', v: '' },
        { k: 'DN', v: '' }
      ] }
    ]
  };
  for (const ladder of [ton, ctu]) {
    const frame = frameLadder(layout(ladder, null, EDITOR_GEO), { geo: EDITOR_GEO });
    const block = frame.items.find((it) => it.node.t === 'blk');
    const bounds = blockBounds(block, EDITOR_GEO);
    assert.ok(bounds.boxY >= 0, `${block.node.k} box top is ${bounds.boxY}`);
    assert.ok(bounds.titleY >= 12, `${block.node.k} title baseline ${bounds.titleY} is clipped`);
    assert.ok(bounds.bottom <= frame.h + 0.01, `${block.node.k} block extends past the frame`);
    assert.ok(bounds.titleY < bounds.boxY + bounds.bh, `${block.node.k} title is outside its box`);
  }
});

test('the program round-trips through localStorage and Reset restores one empty rung', () => {
  const storage = memoryStorage();
  const program = sealInProgram();
  const saved = saveProgram(program, storage);
  assert.equal(saved.ok, true);
  const loaded = loadProgram(storage);
  assert.deepEqual(compileRung(loaded.rungs[0]), compileRung(program.rungs[0]));
  const again = must(addInstruction(loaded, { rungId: loaded.rungs[0].id, kind: 'XIC', tag: 'Extra' }));
  assert.equal(new Set(JSON.stringify(again.program).match(/"id":"[^"]+"/g)).size > 0, true);
  const ids = [];
  for (const rung of again.program.rungs) {
    ids.push(rung.id);
    for (const el of rung.elements) {
      ids.push(el.id);
      if (el.kind === 'branch') for (const leg of el.legs) for (const instr of leg) ids.push(instr.id);
    }
  }
  assert.equal(new Set(ids).size, ids.length, 'loaded programs must not mint a duplicate id');

  const reset = resetStoredProgram(storage);
  assert.equal(reset.rungs.length, 1);
  assert.equal(reset.rungs[0].elements.length, 0);
  assert.equal(storage.getItem(EDITOR_STORAGE_KEY).includes('"elements":[]'), true);

  const broken = memoryStorage();
  broken.setItem(EDITOR_STORAGE_KEY, '{');
  assert.equal(loadProgram(broken).rungs.length, 1);
  broken.setItem(EDITOR_STORAGE_KEY, JSON.stringify({ version: 2, rungs: [] }));
  assert.equal(loadProgram(broken).rungs[0].elements.length, 0);
});
