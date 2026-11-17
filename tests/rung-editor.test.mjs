/**
 * Learner rung editor: model operations, validation wording, and scans through analyze().
 *
 *   node --test tests/rung-editor.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { analyze, initialState } from '../web/src/lib/ladder.js';
import {
  EDITOR_BRANCH_LIMIT_TEXT,
  EDITOR_STORAGE_KEY,
  addInstruction,
  addParallelBranch,
  addRung,
  applyEditorScan,
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
    const res = must(addInstruction(next, { rungId, kind: instr.kind, tag: instr.tag }));
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
  const openError = validateProgram(open).find((err) => err.code === 'ote-required');
  assert.match(openError.message, /must end with an output coil \(OTE\) on the right/);

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
  const midError = validateProgram(mid).find((err) => err.code === 'ote-not-last');
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
  const insideError = validateProgram(inside).find((err) => err.code === 'ote-in-branch');
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
