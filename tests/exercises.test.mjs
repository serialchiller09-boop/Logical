/**
 * Graded exercises: behavior checks, not a drawing match.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  EXERCISES,
  exerciseById,
  gradeExercise,
  loadProgress,
  saveProgress,
  starterProgram,
  EXERCISE_PROGRESS_KEY
} from '../web/src/lib/exercises.js';
import { addInstruction, addParallelBranch, addRung, createProgram } from '../web/src/lib/rungEditor.js';

function must(result) {
  assert.equal(result.ok, true, result.error?.message || 'editor operation failed');
  return result;
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

function xicOte(input, output) {
  return addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: input },
    { kind: 'OTE', tag: output }
  ]);
}

const byId = Object.fromEntries(EXERCISES.map((item) => [item.id, item]));

function pass(id, program) {
  const result = gradeExercise(program, byId[id]);
  assert.equal(result.ok, true, result.message);
}

function fail(id, program) {
  const result = gradeExercise(program, byId[id]);
  assert.equal(result.ok, false, 'a wrong program was marked passed');
  assert.match(result.message, /should/);
  assert.ok(result.expected);
  assert.ok(result.actual);
  return result;
}

test('exercises are the six tasks in order', () => {
  assert.deepEqual(EXERCISES.map((item) => item.id), [
    'lamp-follows',
    'lamp-when-off',
    'both-switches',
    'either-switch',
    'start-stop',
    'motor-delay'
  ]);
  assert.equal(exerciseById('nope'), null);
});

test('lamp follows a switch: XIC passes, XIO fails', () => {
  pass('lamp-follows', xicOte('Switch', 'Lamp'));
  const wrong = fail('lamp-when-off', xicOte('Switch', 'Lamp'));
  assert.match(wrong.message, /Switch off/);
  assert.equal(wrong.expected.Lamp, 1);
  assert.equal(wrong.actual.Lamp, 0);
  const inverted = addSeries(createProgram(), 0, [
    { kind: 'XIO', tag: 'Switch' },
    { kind: 'OTE', tag: 'Lamp' }
  ]);
  const followed = fail('lamp-follows', inverted);
  assert.match(followed.message, /Switch off/);
  assert.equal(followed.expected.Lamp, 0);
  assert.equal(followed.actual.Lamp, 1);
});

test('lamp on when the switch is off: XIO passes, XIC fails', () => {
  pass('lamp-when-off', addSeries(createProgram(), 0, [
    { kind: 'XIO', tag: 'Switch' },
    { kind: 'OTE', tag: 'Lamp' }
  ]));
  const wrong = fail('lamp-when-off', xicOte('Switch', 'Lamp'));
  assert.match(wrong.message, /should stay on, but it turned off|should be off, but it turned on|Switch off/);
});

test('both switches: series passes, a branch fails', () => {
  pass('both-switches', addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'SwitchA' },
    { kind: 'XIC', tag: 'SwitchB' },
    { kind: 'OTE', tag: 'Lamp' }
  ]));
  let branched = createProgram();
  const rungId = branched.rungs[0].id;
  let res = must(addInstruction(branched, { rungId, kind: 'XIC', tag: 'SwitchA' }));
  branched = res.program;
  res = must(addParallelBranch(branched, { rungId, elementId: res.focusId }));
  branched = res.program;
  res = must(addInstruction(branched, { rungId, kind: 'XIC', tag: 'SwitchB', place: 'leg', legIndex: 1 }));
  branched = res.program;
  branched = must(addInstruction(branched, { rungId, kind: 'OTE', tag: 'Lamp' })).program;
  const wrong = fail('both-switches', branched);
  assert.match(wrong.message, /only SwitchA/);
  assert.equal(wrong.actual.Lamp, 1);
});

test('either switch: a branch passes, series fails', () => {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  let res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'SwitchA' }));
  program = res.program;
  res = must(addParallelBranch(program, { rungId, elementId: res.focusId }));
  program = res.program;
  res = must(addInstruction(program, { rungId, kind: 'XIC', tag: 'SwitchB', place: 'leg', legIndex: 1 }));
  program = res.program;
  program = must(addInstruction(program, { rungId, kind: 'OTE', tag: 'Lamp' })).program;
  pass('either-switch', program);
  const wrong = fail('either-switch', addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'SwitchA' },
    { kind: 'XIC', tag: 'SwitchB' },
    { kind: 'OTE', tag: 'Lamp' }
  ]));
  assert.match(wrong.message, /only SwitchA/);
  assert.equal(wrong.expected.Lamp, 1);
  assert.equal(wrong.actual.Lamp, 0);
});

test('start/stop: seal-in and a latch both pass; no branch fails and stays off', () => {
  let seal = createProgram();
  const rungId = seal.rungs[0].id;
  let res = must(addInstruction(seal, { rungId, kind: 'XIC', tag: 'Start' }));
  seal = res.program;
  res = must(addParallelBranch(seal, { rungId, elementId: res.focusId }));
  seal = res.program;
  res = must(addInstruction(seal, { rungId, kind: 'XIC', tag: 'Motor', place: 'leg', legIndex: 1 }));
  seal = res.program;
  const branch = seal.rungs[0].elements.find((el) => el.kind === 'branch');
  res = must(addInstruction(seal, { rungId, kind: 'XIC', tag: 'Stop', place: 'series', afterId: branch.id }));
  seal = res.program;
  seal = must(addInstruction(seal, { rungId, kind: 'OTE', tag: 'Motor' })).program;
  pass('start-stop', seal);

  let latch = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'OTL', tag: 'Motor' }
  ]);
  latch = must(addRung(latch)).program;
  latch = addSeries(latch, 1, [
    { kind: 'XIO', tag: 'Stop' },
    { kind: 'OTU', tag: 'Motor' }
  ]);
  pass('start-stop', latch);

  const noBranch = fail('start-stop', addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'XIC', tag: 'Stop' },
    { kind: 'OTE', tag: 'Motor' }
  ]));
  assert.match(noBranch.message, /Start pressed then released/);
  assert.match(noBranch.message, /Motor should stay on, but it turned off/);
  assert.equal(noBranch.expected.Motor, 1);
  assert.equal(noBranch.actual.Motor, 0);

  const xioStop = fail('start-stop', addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'XIO', tag: 'Stop' },
    { kind: 'OTE', tag: 'Motor' }
  ]));
  assert.match(xioStop.message, /Stop not pressed/);
  assert.equal(xioStop.actual.Motor, 0);

  // Start is in parallel with the seal, so a held Start keeps the motor on while Stop is pressed.
  let override = createProgram();
  const overrideRung = override.rungs[0].id;
  res = must(addInstruction(override, { rungId: overrideRung, kind: 'XIC', tag: 'Start' }));
  override = res.program;
  res = must(addParallelBranch(override, { rungId: overrideRung, elementId: res.focusId }));
  override = res.program;
  res = must(addInstruction(override, { rungId: overrideRung, kind: 'XIC', tag: 'Motor', place: 'leg', legIndex: 1 }));
  override = res.program;
  res = must(addInstruction(override, { rungId: overrideRung, kind: 'XIC', tag: 'Stop', place: 'leg', legIndex: 1 }));
  override = res.program;
  override = must(addInstruction(override, { rungId: overrideRung, kind: 'OTE', tag: 'Motor' })).program;
  const stopLoses = fail('start-stop', override);
  assert.match(stopLoses.message, /Start and Stop both pressed/);
  assert.match(stopLoses.message, /Motor should be off, but it turned on/);
  assert.equal(stopLoses.expected.Motor, 0);
  assert.equal(stopLoses.actual.Motor, 1);
});

test('motor delay: either rung order passes; a latch, an immediate coil, and a 1 second timer fail', () => {
  let program = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'TON', tag: 'T_Delay', pre: 2000 }
  ]);
  program = must(addRung(program)).program;
  program = addSeries(program, 1, [
    { kind: 'XIC', tag: 'T_Delay.DN' },
    { kind: 'OTE', tag: 'Motor' }
  ]);
  pass('motor-delay', program);

  // Motor rung above the TON reads .DN from the previous scan, so it turns on one scan later.
  let reversed = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'T_Delay.DN' },
    { kind: 'OTE', tag: 'Motor' }
  ]);
  reversed = must(addRung(reversed)).program;
  reversed = addSeries(reversed, 1, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'TON', tag: 'T_Delay', pre: 2000 }
  ]);
  pass('motor-delay', reversed);

  let latched = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'TON', tag: 'T_Delay', pre: 2000 }
  ]);
  latched = must(addRung(latched)).program;
  latched = addSeries(latched, 1, [
    { kind: 'XIC', tag: 'T_Delay.DN' },
    { kind: 'OTL', tag: 'Motor' }
  ]);
  const held = fail('motor-delay', latched);
  assert.match(held.message, /After Start is released/);
  assert.match(held.message, /Motor should be off, but it turned on/);
  assert.equal(held.expected.Motor, 0);
  assert.equal(held.actual.Motor, 1);

  const immediate = fail('motor-delay', xicOte('Start', 'Motor'));
  assert.match(immediate.message, /1\.9 seconds/);
  assert.equal(immediate.expected.Motor, 0);
  assert.equal(immediate.actual.Motor, 1);

  let early = addSeries(createProgram(), 0, [
    { kind: 'XIC', tag: 'Start' },
    { kind: 'TON', tag: 'T_Delay', pre: 1000 }
  ]);
  early = must(addRung(early)).program;
  early = addSeries(early, 1, [
    { kind: 'XIC', tag: 'T_Delay.DN' },
    { kind: 'OTE', tag: 'Motor' }
  ]);
  const tooSoon = fail('motor-delay', early);
  assert.match(tooSoon.message, /1\.9 seconds/);
  assert.equal(tooSoon.actual.Motor, 1);
});

test('the starter program does not pass, and a blank program is not a spoiler', () => {
  for (const exercise of EXERCISES) {
    const result = gradeExercise(starterProgram(exercise), exercise);
    assert.equal(result.ok, false, exercise.id);
    assert.doesNotMatch(result.message, /XIC|branch|preset|2000/i);
  }
});

test('exercise progress round-trips in the versioned key', () => {
  const saved = { version: 1, done: { 'lamp-follows': true }, programs: { 'lamp-follows': starterProgram(byId['lamp-follows']) } };
  const mem = new Map();
  const storage = {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, String(value))
  };
  saveProgress(saved, storage);
  assert.equal(mem.has(EXERCISE_PROGRESS_KEY), true);
  const loaded = loadProgress(storage);
  assert.equal(loaded.done['lamp-follows'], true);
  assert.equal(loaded.programs['lamp-follows'].rungs[0].elements.at(-1).tag, 'Lamp');
  mem.set(EXERCISE_PROGRESS_KEY, '{');
  assert.deepEqual(loadProgress(storage).done, {});
});

test('the exercise page names Check and the list', () => {
  const list = awaitText('../web/src/pages/Exercises.jsx');
  const page = awaitText('../web/src/pages/Exercise.jsx');
  assert.match(list, /aria-label="Graded exercises"/);
  assert.match(page, /aria-label="Check this exercise"/);
  assert.match(page, /Rockwell reference/);
  const tasks = readFileSync(new URL('../web/src/lib/exercises.js', import.meta.url), 'utf8');
  assert.match(tasks, /Stop is TRUE when the button is not pressed/);
  for (const exercise of EXERCISES) {
    assert.ok(exercise.hint && !/rung-condition-in|BOOL/.test(exercise.hint), exercise.id);
    assert.match(exercise.reference, /1756-RM003/);
    for (const paragraph of exercise.task) {
      assert.doesNotMatch(paragraph, /rung-condition-in|BOOL/);
    }
  }
  assert.deepEqual(byId['start-stop'].steps.map((step) => step.expect.Motor), [1, 1, 0, 0, 0]);
  assert.deepEqual(byId['start-stop'].steps[2].bits, { Start: 1, Stop: 0 });
  assert.equal(byId['motor-delay'].steps[1].repeat, 2);
  assert.equal(byId['motor-delay'].steps[2].expect.Motor, 0);
});

function awaitText(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}
