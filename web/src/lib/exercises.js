/**
 * Graded rung exercises. A solution passes if its outputs match the checkpoints
 * when scanned with applyEditorScan / analyze. The drawing is not compared.
 *
 * Instruction claims in the task text cite 1756-RM003T-EN-P (November 2018).
 * The wiring note for Stop is an exercise assumption, not a manual rule.
 */

import { applyEditorScan, imageFromBits, validateProgram, createProgram, addInstruction } from './rungEditor.js';

export const EXERCISE_PROGRESS_KEY = 'logical.rung-exercises.v1';

function failText(situation, tag, expected, actual) {
  if (expected === 1 && actual === 0) return `${situation}, ${tag} should stay on, but it turned off.`;
  if (expected === 0 && actual === 1) return `${situation}, ${tag} should be off, but it turned on.`;
  return `${situation}, ${tag} should be ${expected ? 'on' : 'off'}.`;
}

const LAMP = ['Lamp'];

export const EXERCISES = [
  {
    id: 'lamp-follows',
    title: 'Lamp follows a switch',
    inputs: ['Switch'],
    outputs: LAMP,
    task: [
      'Make Lamp follow Switch. When Switch is on, Lamp is on. When Switch is off, Lamp is off.'
    ],
    hint: 'Use the tags Switch and Lamp. An XIC on Switch in front of the Lamp coil follows the switch.',
    reference: '1756-RM003 Examine If Closed (XIC) is true when its BOOL is 1 and rung-condition-in is true. Output Energize (OTE) writes that rung-condition-in to its BOOL on every scan: 1 when the rung is true, 0 when it is false.',
    steps: [
      { bits: { Switch: 0 }, expect: { Lamp: 0 }, situation: 'With Switch off' },
      { bits: { Switch: 1 }, expect: { Lamp: 1 }, situation: 'With Switch on' },
      { bits: { Switch: 0 }, expect: { Lamp: 0 }, situation: 'When Switch is turned off again' }
    ]
  },
  {
    id: 'lamp-when-off',
    title: 'Lamp on when the switch is off',
    inputs: ['Switch'],
    outputs: LAMP,
    task: [
      'Turn Lamp on only while Switch is off. When Switch is on, Lamp is off.'
    ],
    hint: 'Use an XIO on Switch. It passes while Switch is off.',
    reference: '1756-RM003 Examine If Open (XIO) is true when its BOOL is 0 and rung-condition-in is true. OTE writes 0 whenever its rung is false.',
    steps: [
      { bits: { Switch: 0 }, expect: { Lamp: 1 }, situation: 'With Switch off' },
      { bits: { Switch: 1 }, expect: { Lamp: 0 }, situation: 'With Switch on' },
      { bits: { Switch: 0 }, expect: { Lamp: 1 }, situation: 'When Switch is turned off again' }
    ]
  },
  {
    id: 'both-switches',
    title: 'Both switches',
    inputs: ['SwitchA', 'SwitchB'],
    outputs: LAMP,
    task: [
      'Turn Lamp on only when SwitchA and SwitchB are both on. Either switch off turns Lamp off.'
    ],
    hint: 'In this editor, contacts in series are the AND.',
    reference: '1756-RM003 Examine If Closed (XIC) is true when its BOOL is 1 and rung-condition-in is true. "Series is AND" describes this editor. It is not a sentence in that manual.',
    steps: [
      { bits: { SwitchA: 1, SwitchB: 1 }, expect: { Lamp: 1 }, situation: 'With SwitchA and SwitchB both on' },
      { bits: { SwitchA: 1, SwitchB: 0 }, expect: { Lamp: 0 }, situation: 'With only SwitchA on' },
      { bits: { SwitchA: 0, SwitchB: 1 }, expect: { Lamp: 0 }, situation: 'With only SwitchB on' },
      { bits: { SwitchA: 0, SwitchB: 0 }, expect: { Lamp: 0 }, situation: 'With both switches off' }
    ]
  },
  {
    id: 'either-switch',
    title: 'Either switch',
    inputs: ['SwitchA', 'SwitchB'],
    outputs: LAMP,
    task: [
      'Turn Lamp on when SwitchA is on, or SwitchB is on, or both. Lamp is off only when both are off.'
    ],
    hint: 'In this editor, a parallel branch is the OR.',
    reference: '1756-RM003 Examine If Closed (XIC) is true when its BOOL is 1 and rung-condition-in is true. "A parallel branch is the OR" describes this editor. It is not a sentence in that manual.',
    steps: [
      { bits: { SwitchA: 1, SwitchB: 0 }, expect: { Lamp: 1 }, situation: 'With only SwitchA on' },
      { bits: { SwitchA: 0, SwitchB: 1 }, expect: { Lamp: 1 }, situation: 'With only SwitchB on' },
      { bits: { SwitchA: 1, SwitchB: 1 }, expect: { Lamp: 1 }, situation: 'With both switches on' },
      { bits: { SwitchA: 0, SwitchB: 0 }, expect: { Lamp: 0 }, situation: 'With both switches off' }
    ]
  },
  {
    id: 'start-stop',
    title: 'Start and stop a motor',
    inputs: ['Start', 'Stop'],
    outputs: ['Motor'],
    task: [
      'Start turns Motor on, and Motor stays on after you release Start. Stop turns Motor off even while Start is still held, and Motor stays off after you release Stop.',
      'For this exercise, Stop is a normally closed field contact. The tag Stop is TRUE when the button is not pressed, and FALSE when it is pressed.'
    ],
    hint: 'A plain coil turns off when its rung goes false, so Motor needs a way to hold itself. Stop has to be able to break that hold.',
    reference: '1756-RM003 Examine If Closed (XIC) is true when that bit is 1. Output Energize (OTE) writes 0 on every scan whose rung is false, so a coil does not hold by itself. Output Latch (OTL) leaves the bit unchanged when its rung is false. Output Unlatch (OTU) clears the bit only when its rung is true. The normally closed Stop wiring is an exercise assumption, not a rule from the manual.',
    steps: [
      { bits: { Start: 1, Stop: 1 }, expect: { Motor: 1 }, situation: 'With Start pressed and Stop not pressed' },
      { bits: { Start: 0, Stop: 1 }, expect: { Motor: 1 }, situation: 'With Start pressed then released, and Stop not pressed' },
      { bits: { Start: 1, Stop: 0 }, expect: { Motor: 0 }, situation: 'With Start and Stop both pressed' },
      { bits: { Start: 0, Stop: 0 }, expect: { Motor: 0 }, situation: 'When Stop is pressed' },
      { bits: { Start: 0, Stop: 1 }, expect: { Motor: 0 }, situation: 'After Stop is released' }
    ]
  },
  {
    id: 'motor-delay',
    title: 'Motor starts after 2 seconds',
    inputs: ['Start'],
    outputs: ['Motor'],
    task: [
      'Hold Start, and Motor stays off for 2 seconds, then turns on. Release Start, and Motor turns off.'
    ],
    hint: 'Use a timer on delay (TON). Each step on this page is 100 ms, so a 2 second preset is 2000.',
    reference: '1756-RM003T-EN-P, November 2018, Timer On Delay (TON), pp. 130 and 132, and the timer chapter p. 91: the time base is 1 millisecond, so a 2 second preset is 2000. .DN is set when .ACC reaches .PRE. A false rung clears .ACC, .EN, .TT, and .DN. This page adds 100 ms of elapsed time on every step, in place of the manual’s (current time minus last time scanned) on p. 131. That 100 ms step is not a Logix task period.',
    steps: [
      {
        bits: { Start: 1 },
        repeat: 19,
        expect: { Motor: 0 },
        situation: 'After Start has been held for 1.9 seconds (19 steps of 100 ms)'
      },
      {
        // The motor rung may sit above the TON. That rung reads .DN before this scan's
        // timer update, so Motor can turn on one scan later. Off at 1.9 s, on by 2.1 s.
        bits: { Start: 1 },
        repeat: 2,
        expect: { Motor: 1 },
        situation: 'By the time Start has been held for 2.1 seconds (21 steps of 100 ms)'
      },
      {
        // Same one-scan lag on the way down: the motor rung can still see the old .DN
        // on the scan Start drops. A latch stays on, so two scans is enough to fail it.
        bits: { Start: 0 },
        repeat: 2,
        expect: { Motor: 0 },
        situation: 'After Start is released'
      }
    ]
  }
];

export function exerciseById(id) {
  return EXERCISES.find((item) => item.id === id) || null;
}

/** Output tag is filled in. The conditions are not. */
export function starterProgram(exercise) {
  let program = createProgram();
  const rungId = program.rungs[0].id;
  const output = exercise.outputs[0];
  const added = addInstruction(program, { rungId, kind: 'OTE', tag: output });
  return added.program;
}

export function gradeExercise(program, exercise) {
  const errors = validateProgram(program);
  if (errors.length) {
    return {
      ok: false,
      message: `This program cannot be scanned yet. ${errors[0].message}`,
      expected: null,
      actual: null
    };
  }
  const state = imageFromBits({});
  for (let index = 0; index < exercise.steps.length; index += 1) {
    const step = exercise.steps[index];
    const times = step.repeat || 1;
    let snapshot = state.bits;
    for (let n = 0; n < times; n += 1) {
      for (const [tag, value] of Object.entries(step.bits || {})) state.bits[tag] = value ? 1 : 0;
      const scanned = applyEditorScan(program, state);
      if (!scanned.ok) {
        return {
          ok: false,
          message: `This program cannot be scanned yet. ${scanned.errors[0].message}`,
          expected: null,
          actual: null
        };
      }
      snapshot = state.bits;
    }
    const expected = step.expect || {};
    const actual = {};
    for (const tag of Object.keys(expected)) actual[tag] = snapshot[tag] ? 1 : 0;
    for (const [tag, want] of Object.entries(expected)) {
      const expectedBit = want ? 1 : 0;
      if (actual[tag] !== expectedBit) {
        return {
          ok: false,
          step: index + 1,
          message: failText(step.situation, tag, expectedBit, actual[tag]),
          expected: { [tag]: expectedBit },
          actual: { [tag]: actual[tag] }
        };
      }
    }
  }
  return { ok: true, message: 'Passed. The outputs matched every check in this exercise.', expected: null, actual: null };
}

export function emptyProgress() {
  return { version: 1, done: {}, programs: {} };
}

export function loadProgress(storage) {
  try {
    const raw = storage?.getItem?.(EXERCISE_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || typeof data !== 'object') return emptyProgress();
    return {
      version: 1,
      done: data.done && typeof data.done === 'object' ? data.done : {},
      programs: data.programs && typeof data.programs === 'object' ? data.programs : {}
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress, storage) {
  storage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify({ version: 1, done: progress.done || {}, programs: progress.programs || {} }));
}
