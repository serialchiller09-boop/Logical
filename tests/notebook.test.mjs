import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_IO_ROWS,
  BUILD_PHASES,
  CONTROLLER_BASIS,
  DRAWING_OBSERVATIONS,
  FAT_TESTS,
  KIRK_STATES,
  PERMISSIVE_MATRIX,
  PROGRAM_ROUTINES,
  TRAINER_IO
} from '../web/src/data/substationProject.js';

test('substation trainer map uses the requested physical controls and lamps exactly', () => {
  assert.equal(TRAINER_IO.maintained.length, 15, 'maintained toggles');
  assert.equal(TRAINER_IO.momentary.length, 15, 'momentary toggles/buttons');
  assert.equal(TRAINER_IO.analog.length, 2, 'potentiometers');
  assert.equal(TRAINER_IO.green.length, 6, 'green LEDs');
  assert.equal(TRAINER_IO.amber.length, 2, 'amber LEDs');
  assert.equal(ALL_IO_ROWS.length, 40);

  const tags = ALL_IO_ROWS.map((row) => row.tag);
  assert.equal(new Set(tags).size, tags.length, 'each physical point has one unique PLC tag');
  for (const row of ALL_IO_ROWS) {
    assert.ok(row.channel, `${row.tag} has no trainer channel`);
    assert.ok(row.studio, `${row.tag} has no Studio 5000 example address`);
    assert.ok(row.rslogix, `${row.tag} has no RSLogix 500 example address`);
    assert.ok(row.device, `${row.tag} has no panel label/purpose`);
  }
});

test('the uploaded one-line and L18ER basis drive four independent capacitor-bank instances', () => {
  assert.match(JSON.stringify(DRAWING_OBSERVATIONS), /138\/4\.16 kV/i);
  assert.match(JSON.stringify(DRAWING_OBSERVATIONS), /four repeated three-phase shunt-capacitor/i);
  assert.match(JSON.stringify(CONTROLLER_BASIS), /L18ER/i);

  const maintainedTags = new Set(TRAINER_IO.maintained.map((row) => row.tag));
  const momentaryTags = new Set(TRAINER_IO.momentary.map((row) => row.tag));
  for (let n = 1; n <= 4; n += 1) {
    assert.ok(maintainedTags.has(`DI_CBCap${n}_52a`), `CAP-${n} needs a physical state input`);
    assert.ok(maintainedTags.has(`DI_K${n}AtBreaker`), `K${n} needs an independent key-position input`);
    assert.ok(momentaryTags.has(`DI_PB_Cap${n}_Close`), `CAP-${n} needs a close request`);
    assert.ok(momentaryTags.has(`DI_PB_Cap${n}_Open`), `CAP-${n} needs an open request`);
  }
});

test('the notebook is a gated build plan rather than a loose equipment list', () => {
  assert.equal(BUILD_PHASES.length, 12);
  const phaseIds = BUILD_PHASES.map((phase) => phase.id);
  assert.equal(new Set(phaseIds).size, phaseIds.length);
  for (const phase of BUILD_PHASES) {
    assert.ok(phase.tasks.length >= 5, `${phase.id} needs an actionable checklist`);
    assert.ok(phase.evidence.length > 20, `${phase.id} needs an evidence/deliverable gate`);
  }
  assert.ok(PROGRAM_ROUTINES.length >= 10, 'scan order should name all controller layers');
  assert.ok(FAT_TESTS.length >= 12, 'FAT must cover failure cases, not only a happy path');
});

test('breaker and Kirk-key plans keep safety authority out of the standard PLC', () => {
  const permissiveText = JSON.stringify(PERMISSIVE_MATRIX);
  const kirkText = JSON.stringify(KIRK_STATES);
  assert.match(permissiveText, /protection trip remains hardwired|mechanical Kirk system is authoritative/i);
  assert.match(kirkText, /absence of voltage.*not PLC/i);
  assert.match(kirkText, /mechanically released/i);
  assert.ok(KIRK_STATES.length >= 6);
});
