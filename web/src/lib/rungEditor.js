/**
 * Learner rung editor model.
 *
 * Programs compile to the ladder trees in web/src/lib/ladder.js
 * ({ t:'and' } series, { t:'or' } parallel, { t:'no'|'nc'|'coil' } leaves)
 * and are scanned with analyze(). This file does not evaluate power flow itself.
 *
 * Instruction behavior this editor claims, from Rockwell Automation publication
 * 1756-RM003, Logix 5000 Controllers General Instructions Reference Manual
 * (1756-RM003T-EN-P, November 2018):
 *   XIC — Examine If Closed. BOOL tag. When rung-condition-in is false,
 *         rung-condition-out stays false. When rung-condition-in is true,
 *         rung-condition-out is true if the bit is true and false if it is not.
 *   XIO — Examine If Open. BOOL tag. When rung-condition-in is true,
 *         rung-condition-out is true if the bit is false, and false if the bit is true.
 *   OTE — Output Energize. Writes the BOOL from rung-condition-in on every
 *         scan (true → 1, false → 0) and sets rung-condition-out equal to
 *         rung-condition-in. The operands note says unexpected operation may
 *         occur if an output tag is overwritten.
 *   OTL — Output Latch. When rung-condition-in is true, sets the BOOL.
 *         When rung-condition-in is false, leaves the BOOL unchanged.
 *         Rung-condition-out equals rung-condition-in. (Output Latch (OTL))
 *   OTU — Output Unlatch. When rung-condition-in is true, clears the BOOL.
 *         When rung-condition-in is false, leaves the BOOL unchanged.
 *         (Output Unlatch (OTU))
 *   TON — Timer On Delay. TIMER .PRE/.ACC are milliseconds (time base 1 ms).
 *         Enabled: ACC increases by the scan's elapsed time, .EN is true,
 *         .DN when ACC >= PRE, .TT while timing. Disabled: ACC, EN, TT, DN clear.
 *         (Timer On Delay (TON))
 *   TOF — Timer Off Delay. Rung true: ACC=0, EN true, TT false, DN true.
 *         Rung false: ACC increases, DN stays true until ACC reaches PRE, then DN clears.
 *         Prescan: ACC=PRE, EN/TT/DN false. (Timer Off Delay (TOF))
 *   CTU — Count Up. ACC increments by one when rung-condition-in is true and .CU
 *         was false. .CU then follows rung-condition-in. .DN when ACC >= PRE.
 *         Prescan (Count Up execution table) sets .CU true before the first scan
 *         of a fresh or Reset image, so an input that is already true does not count.
 *         (Count Up (CTU))
 *   RES — When rung-condition-in is true, clears TIMER or COUNTER .ACC and the
 *         control bits. When false, changes nothing. (Reset (RES))
 * This trainer scans rungs top to bottom and each rung left to right, so a later
 * OTE is the write that remains. OTE prescan/postscan (the manual clears the
 * bit) is not simulated. Each editor scan adds EDITOR_SCAN_MS milliseconds as the
 * timer's elapsed time. The manual adds (current_time - last_time_scanned); this
 * fixed step is the stand-in for that elapsed time, not a Logix task period.
 *
 * Editor limits that are NOT Studio 5000 rules: one parallel branch per rung,
 * one level deep, contacts only inside a branch, one output instruction at the
 * right end (OTE, OTL, OTU, TON, TOF, CTU, or RES), and a restricted tag spelling.
 */

import { analyze, applyCtuPrescan, initialState } from './ladder.js';

export const EDITOR_STORAGE_KEY = 'logical.rung-editor.v1';

/** Each Step, and each tick while Start is running, adds this many milliseconds to a timer. */
export const EDITOR_SCAN_MS = 100;

/**
 * Wall-clock gap between scans while Start is running.
 * This is not EDITOR_SCAN_MS, and it is not a Logix task period.
 */
export const EDITOR_RUN_INTERVAL_MS = 500;

/** Shown on the page. Kept here so tests can pin the wording learners actually see. */
export const EDITOR_BRANCH_LIMIT_TEXT =
  'One parallel branch per rung, and only one level deep. Each leg is contacts in series (XIC or XIO). A branch inside a leg is not available. The output stays on the right, after the branch, not inside it. The output can be OTE, OTL, OTU, TON, TOF, CTU, or RES.';

const TAG_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const CONTACT_TAG_RE = /^[A-Za-z][A-Za-z0-9_]{0,31}\.(DN|EN|TT|CU)$/;
const CONTACT_KINDS = new Set(['XIC', 'XIO']);
const OUTPUT_KINDS = new Set(['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'CTU', 'RES']);
const PRESET_KINDS = new Set(['TON', 'TOF', 'CTU']);
const KINDS = new Set([...CONTACT_KINDS, ...OUTPUT_KINDS]);

export function isEditorTag(tag) {
  return TAG_RE.test(String(tag ?? ''));
}

export function isContactTag(tag) {
  const text = String(tag ?? '');
  return TAG_RE.test(text) || CONTACT_TAG_RE.test(text);
}

function isOutputKind(kind) {
  return OUTPUT_KINDS.has(kind);
}

function fail(program, code, message) {
  return { ok: false, program, error: { code, message } };
}

function nextId(program, prefix) {
  const seq = Number.isInteger(program.seq) && program.seq > 0 ? program.seq : 1;
  program.seq = seq + 1;
  return `${prefix}${seq}`;
}

function cloneProgram(program) {
  return structuredClone(program);
}

function locate(rung, elementId) {
  if (!elementId) return null;
  const elements = rung.elements || [];
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    if (element.id === elementId) return { where: 'series', index, element };
    if (element.kind === 'branch') {
      for (let legIndex = 0; legIndex < (element.legs || []).length; legIndex++) {
        const leg = element.legs[legIndex];
        for (let contactIndex = 0; contactIndex < leg.length; contactIndex++) {
          if (leg[contactIndex].id === elementId) {
            return {
              where: 'leg',
              index,
              legIndex,
              contactIndex,
              element: leg[contactIndex],
              branch: element
            };
          }
        }
      }
    }
  }
  return null;
}

export function createProgram() {
  const program = { version: 1, seq: 1, rungs: [] };
  return addRung(program).program;
}

export function addRung(program, { afterRungId = null } = {}) {
  const next = cloneProgram(program);
  if (!Array.isArray(next.rungs)) next.rungs = [];
  const id = nextId(next, 'r');
  const rung = { id, elements: [] };
  let index = next.rungs.length;
  if (afterRungId) {
    const at = next.rungs.findIndex((r) => r.id === afterRungId);
    if (at >= 0) index = at + 1;
  }
  next.rungs.splice(index, 0, rung);
  return {
    ok: true,
    program: next,
    selection: { rungId: id, elementId: null, place: 'rung', legIndex: null }
  };
}

export function deleteRung(program, rungId) {
  const next = cloneProgram(program);
  const index = (next.rungs || []).findIndex((r) => r.id === rungId);
  if (index < 0) return fail(program, 'missing-rung', 'That rung is not in the program.');
  next.rungs.splice(index, 1);
  if (next.rungs.length === 0) {
    const id = nextId(next, 'r');
    next.rungs.push({ id, elements: [] });
    return {
      ok: true,
      program: next,
      selection: { rungId: id, elementId: null, place: 'rung', legIndex: null },
      notice: 'The only rung was cleared. The program keeps one empty rung.'
    };
  }
  const neighbor = next.rungs[Math.min(index, next.rungs.length - 1)];
  return {
    ok: true,
    program: next,
    selection: { rungId: neighbor.id, elementId: null, place: 'rung', legIndex: null }
  };
}

function seriesInsertIndex(elements, afterId) {
  const outputAt = elements.findIndex((el) => isOutputKind(el.kind));
  let index;
  if (afterId) {
    const at = elements.findIndex((el) => el.id === afterId);
    if (at < 0) return { error: 'The selected instruction is not on this rung.' };
    index = at + 1;
  } else if (outputAt >= 0) index = outputAt;
  else index = elements.length;
  if (outputAt >= 0 && index > outputAt) index = outputAt;
  return { index };
}

function defaultPreset(kind) {
  if (kind === 'CTU') return 3;
  if (kind === 'TON' || kind === 'TOF') return 500;
  return null;
}

export function addInstruction(program, {
  rungId,
  kind,
  tag = '',
  pre,
  place = 'series',
  afterId = null,
  legIndex = null
} = {}) {
  if (!KINDS.has(kind)) {
    return fail(program, 'bad-kind', 'This editor can add XIC, XIO, OTE, OTL, OTU, TON, TOF, CTU, or RES.');
  }
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  if (!Array.isArray(rung.elements)) rung.elements = [];
  const cleanTag = String(tag ?? '').trim();
  const node = { id: nextId(next, 'e'), kind, tag: cleanTag };
  if (PRESET_KINDS.has(kind)) node.pre = pre == null ? defaultPreset(kind) : pre;

  if (isOutputKind(kind)) {
    if (place === 'leg') {
      return fail(
        program,
        'output-in-branch',
        'An output cannot sit inside a parallel branch in this editor. Put OTE, OTL, OTU, TON, TOF, CTU, or RES on the right, after the branch.'
      );
    }
    if (rung.elements.some((el) => isOutputKind(el.kind))) {
      return fail(
        program,
        'output-exists',
        'This rung already has an output on the right. Delete it before adding another. This editor allows one output instruction per rung.'
      );
    }
    rung.elements.push(node);
    return {
      ok: true,
      program: next,
      selection: { rungId, elementId: node.id, place: 'series', legIndex: null },
      focusId: node.id
    };
  }

  if (place === 'leg') {
    const branch = rung.elements.find((el) => el.kind === 'branch');
    if (!branch) {
      return fail(program, 'no-branch', 'Add a parallel branch before you add a contact on a leg.');
    }
    if (!Number.isInteger(legIndex) || legIndex < 0 || legIndex >= branch.legs.length) {
      return fail(program, 'bad-leg', 'Pick a leg on the parallel branch before adding a contact there.');
    }
    const leg = branch.legs[legIndex].slice();
    if (afterId) {
      const at = leg.findIndex((el) => el.id === afterId);
      if (at < 0) return fail(program, 'missing-instruction', 'The selected instruction is not on that leg.');
      leg.splice(at + 1, 0, node);
    } else leg.push(node);
    branch.legs = branch.legs.map((existing, i) => (i === legIndex ? leg : existing));
    return {
      ok: true,
      program: next,
      selection: { rungId, elementId: node.id, place: 'leg', legIndex },
      focusId: node.id
    };
  }

  const inserted = seriesInsertIndex(rung.elements, afterId);
  if (inserted.error) return fail(program, 'missing-instruction', inserted.error);
  rung.elements.splice(inserted.index, 0, node);
  return {
    ok: true,
    program: next,
    selection: { rungId, elementId: node.id, place: 'series', legIndex: null },
    focusId: node.id
  };
}

export function setInstructionTag(program, { rungId, elementId, tag } = {}) {
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  const found = locate(rung, elementId);
  if (!found || found.element.kind === 'branch') {
    return fail(program, 'missing-instruction', 'That instruction is not on the rung.');
  }
  found.element.tag = String(tag ?? '').trim();
  return {
    ok: true,
    program: next,
    selection: {
      rungId,
      elementId,
      place: found.where === 'leg' ? 'leg' : 'series',
      legIndex: found.where === 'leg' ? found.legIndex : null
    }
  };
}

export function setInstructionPreset(program, { rungId, elementId, pre } = {}) {
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  const found = locate(rung, elementId);
  if (!found || !PRESET_KINDS.has(found.element.kind)) {
    return fail(program, 'missing-instruction', 'That instruction does not have a preset.');
  }
  found.element.pre = pre;
  return {
    ok: true,
    program: next,
    selection: { rungId, elementId, place: 'series', legIndex: null }
  };
}

export function deleteInstruction(program, { rungId, elementId } = {}) {
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  const found = locate(rung, elementId);
  if (!found) return fail(program, 'missing-instruction', 'That instruction is not on the rung.');
  if (found.where === 'series') {
    rung.elements.splice(found.index, 1);
  } else {
    const leg = found.branch.legs[found.legIndex].slice();
    leg.splice(found.contactIndex, 1);
    found.branch.legs = found.branch.legs.map((existing, i) => (i === found.legIndex ? leg : existing));
  }
  return {
    ok: true,
    program: next,
    selection: { rungId, elementId: null, place: 'rung', legIndex: null }
  };
}

export function deleteLeg(program, { rungId, branchId, legIndex } = {}) {
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  const branchIndex = rung.elements.findIndex((el) => el.id === branchId && el.kind === 'branch');
  if (branchIndex < 0) return fail(program, 'missing-instruction', 'That branch is not on the rung.');
  const branch = rung.elements[branchIndex];
  if (!Number.isInteger(legIndex) || legIndex < 0 || legIndex >= branch.legs.length) {
    return fail(program, 'bad-leg', 'That leg is not on the branch.');
  }
  if (branch.legs.length <= 2) {
    const kept = branch.legs.filter((_, i) => i !== legIndex).flat();
    rung.elements.splice(branchIndex, 1, ...kept);
  } else {
    branch.legs = branch.legs.filter((_, i) => i !== legIndex);
  }
  return {
    ok: true,
    program: next,
    selection: { rungId, elementId: null, place: 'rung', legIndex: null }
  };
}

export function addParallelBranch(program, { rungId, elementId = null, addLeg = false } = {}) {
  const next = cloneProgram(program);
  const rung = (next.rungs || []).find((r) => r.id === rungId);
  if (!rung) return fail(program, 'missing-rung', 'That rung is not in the program.');
  if (!Array.isArray(rung.elements)) rung.elements = [];
  const existing = rung.elements.find((el) => el.kind === 'branch');
  const found = elementId ? locate(rung, elementId) : null;
  if (elementId && !found) return fail(program, 'missing-instruction', 'That instruction is not on the rung.');

  if (addLeg && !existing) {
    return fail(program, 'no-branch', 'Add a parallel branch before you add another leg.');
  }

  if (found?.where === 'leg') {
    return fail(
      program,
      'nested-branch',
      'This editor can branch only one level deep. You cannot put a parallel branch inside a leg. Add another leg beside this one instead.'
    );
  }

  if (existing && (addLeg || found?.element?.kind === 'branch')) {
    existing.legs = [...existing.legs, []];
    return {
      ok: true,
      program: next,
      selection: { rungId, elementId: null, place: 'leg', legIndex: existing.legs.length - 1 }
    };
  }

  if (existing) {
    return fail(
      program,
      'one-branch',
      'This rung already has a parallel branch. This editor allows one branch, one level deep. Add another leg, or delete the branch first.'
    );
  }

  if (found?.element?.kind === 'OTE') {
    return fail(
      program,
      'branch-coil',
      'A parallel branch goes around contacts, not the output coil. Select an XIC or XIO.'
    );
  }

  let contactIndex = found && (found.element.kind === 'XIC' || found.element.kind === 'XIO') ? found.index : -1;
  if (contactIndex < 0) {
    for (let i = rung.elements.length - 1; i >= 0; i--) {
      if (rung.elements[i].kind === 'XIC' || rung.elements[i].kind === 'XIO') {
        contactIndex = i;
        break;
      }
    }
  }
  if (contactIndex < 0) {
    return fail(program, 'branch-needs-contact', 'Add an XIC or XIO before you add a parallel branch.');
  }

  const contact = rung.elements[contactIndex];
  const branch = {
    id: nextId(next, 'e'),
    kind: 'branch',
    legs: [[contact], []]
  };
  rung.elements.splice(contactIndex, 1, branch);
  return {
    ok: true,
    program: next,
    selection: { rungId, elementId: null, place: 'leg', legIndex: 1 }
  };
}

function tagError(label, rungId, instr) {
  const name = instr.kind || 'instruction';
  const tag = String(instr.tag ?? '').trim();
  const contact = CONTACT_KINDS.has(instr.kind);
  if (!tag) {
    return {
      code: 'empty-tag',
      rungId,
      elementId: instr.id || null,
      message: `${label}: the ${name} instruction needs a tag name. A blank name is not allowed.`
    };
  }
  const ok = contact ? isContactTag(tag) : isEditorTag(tag);
  if (!ok) {
    const extra = contact
      ? ' A contact may also use a status member: .DN, .EN, .TT, or .CU.'
      : '';
    return {
      code: 'bad-tag',
      rungId,
      elementId: instr.id || null,
      message: `${label}: "${tag}" is not a tag name this editor accepts. Start with a letter, then use only letters, digits, or underscores, up to 40 characters.${extra} This spelling limit is part of the editor, not a Studio 5000 rule confirmed from 1756-RM003.`
    };
  }
  return null;
}

function presetError(label, rungId, instr) {
  if (!PRESET_KINDS.has(instr.kind)) return null;
  const raw = instr.pre;
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  const unitNote = instr.kind === 'CTU'
    ? 'CTU preset is a count.'
    : 'Timer preset is milliseconds. 1756-RM003 says the timer time base is 1 ms.';
  if (raw === '' || raw == null || Number.isNaN(n) || !Number.isInteger(n) || n < 0) {
    return {
      code: 'bad-preset',
      rungId,
      elementId: instr.id || null,
      message: `${label}: ${instr.kind} needs a preset of 0 or a whole number. ${unitNote} A negative preset is not accepted here.`
    };
  }
  return null;
}

function pushInstrErrors(errors, label, rungId, instr, { inBranch }) {
  if (instr.kind === 'branch') {
    errors.push({
      code: 'nested-branch',
      rungId,
      elementId: instr.id || null,
      message: `${label}: this editor allows only one level of branching. A branch inside a branch is not supported here.`
    });
    return;
  }
  if (!KINDS.has(instr.kind)) {
    errors.push({
      code: 'bad-kind',
      rungId,
      elementId: instr.id || null,
      message: `${label}: "${instr.kind}" is not an instruction this editor can scan. Use XIC, XIO, OTE, OTL, OTU, TON, TOF, CTU, or RES.`
    });
    return;
  }
  if (inBranch && isOutputKind(instr.kind)) {
    errors.push({
      code: 'output-in-branch',
      rungId,
      elementId: instr.id || null,
      message: `${label}: an output cannot sit inside a parallel branch in this editor. Put it on the right, after the branch.`
    });
  }
  const tag = tagError(label, rungId, instr);
  if (tag) errors.push(tag);
  const preset = presetError(label, rungId, instr);
  if (preset) errors.push(preset);
}

export function validateProgram(program) {
  const errors = [];
  const rungs = Array.isArray(program?.rungs) ? program.rungs : [];
  rungs.forEach((rung, rungIndex) => {
    const label = `Rung ${rungIndex + 1}`;
    const elements = Array.isArray(rung.elements) ? rung.elements : [];
    const branches = elements.filter((el) => el.kind === 'branch');
    if (branches.length > 1) {
      errors.push({
        code: 'one-branch',
        rungId: rung.id,
        elementId: branches[1].id || null,
        message: `${label}: this editor allows one parallel branch per rung. A second branch is not supported here.`
      });
    }
    elements.forEach((el, index) => {
      if (el.kind === 'branch') {
        const legs = Array.isArray(el.legs) ? el.legs : [];
        if (legs.length < 2) {
          errors.push({
            code: 'branch-legs',
            rungId: rung.id,
            elementId: el.id || null,
            message: `${label}: a parallel branch needs at least two legs.`
          });
        }
        legs.forEach((leg, legIndex) => {
          const contacts = Array.isArray(leg) ? leg : [];
          if (contacts.length === 0) {
            errors.push({
              code: 'empty-leg',
              rungId: rung.id,
              elementId: el.id || null,
              message: `${label}: parallel leg ${legIndex + 1} has no contact. Add an XIC or XIO on that leg, or delete the leg.`
            });
          }
          contacts.forEach((instr) => pushInstrErrors(errors, label, rung.id, instr, { inBranch: true }));
        });
        return;
      }
      pushInstrErrors(errors, label, rung.id, el, { inBranch: false });
      if (isOutputKind(el.kind) && index !== elements.length - 1) {
        errors.push({
          code: 'output-not-last',
          rungId: rung.id,
          elementId: el.id || null,
          message: `${label}: an output has to be the last instruction on the rung. This editor does not place an output before a contact.`
        });
      }
    });
    const last = elements[elements.length - 1];
    if (!last || !isOutputKind(last.kind)) {
      errors.push({
        code: 'output-required',
        rungId: rung.id,
        message: `${label} must end with an output on the right (OTE, OTL, OTU, TON, TOF, CTU, or RES).`
      });
    }
  });
  return errors;
}

function presetNumber(instr) {
  const n = typeof instr.pre === 'number' ? instr.pre : Number(String(instr.pre ?? '').trim());
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function statusPins(kind, pre) {
  if (kind === 'TON' || kind === 'TOF') {
    return [
      { k: 'PRE', v: String(pre) },
      { k: 'ACC', v: '0' },
      { k: 'EN', v: '' },
      { k: 'TT', v: '' },
      { k: 'DN', v: '' }
    ];
  }
  if (kind === 'CTU') {
    return [
      { k: 'PRE', v: String(pre) },
      { k: 'ACC', v: '0' },
      { k: 'CU', v: '' },
      { k: 'DN', v: '' }
    ];
  }
  return [];
}

function compileLeaf(instr) {
  const tag = String(instr.tag ?? '').trim() || '?';
  if (instr.kind === 'XIC') return { t: 'no', a: tag };
  if (instr.kind === 'XIO') return { t: 'nc', a: tag };
  if (instr.kind === 'OTE' || instr.kind === 'OTL' || instr.kind === 'OTU') {
    return { t: 'coil', k: instr.kind, a: tag };
  }
  if (instr.kind === 'TON' || instr.kind === 'TOF' || instr.kind === 'CTU') {
    const pre = presetNumber(instr);
    return { t: 'blk', k: instr.kind, a: tag, p: statusPins(instr.kind, pre) };
  }
  if (instr.kind === 'RES') return { t: 'blk', k: 'RES', a: tag };
  return { t: 'no', a: tag };
}

function compileLeg(leg) {
  const contacts = Array.isArray(leg) ? leg : [];
  // An empty AND would conduct. A closed-open XIC keeps the leg false until a real contact is added.
  if (contacts.length === 0) return { t: 'and', c: [{ t: 'no', a: '?' }] };
  return { t: 'and', c: contacts.map(compileLeaf) };
}

export function compileRung(rung) {
  const children = [];
  for (const el of rung?.elements || []) {
    if (el.kind === 'branch') {
      children.push({ t: 'or', c: (el.legs || []).map(compileLeg) });
    } else if (KINDS.has(el.kind)) {
      children.push(compileLeaf(el));
    }
  }
  return { t: 'and', c: children };
}

export function compileProgram(program) {
  return (program?.rungs || []).map(compileRung);
}

function visitInstructions(program, fn) {
  for (const rung of program?.rungs || []) {
    for (const el of rung.elements || []) {
      if (el.kind === 'branch') {
        for (const leg of el.legs || []) for (const instr of leg || []) fn(instr);
      } else fn(el);
    }
  }
}

export function tagRoles(program) {
  const read = new Set();
  const write = new Map();
  visitInstructions(program, (instr) => {
    const tag = String(instr.tag ?? '').trim();
    if (instr.kind === 'OTE' || instr.kind === 'OTL' || instr.kind === 'OTU') {
      if (!isEditorTag(tag)) return;
      write.set(tag, (write.get(tag) || 0) + 1);
    } else if (instr.kind === 'XIC' || instr.kind === 'XIO') {
      if (!isEditorTag(tag)) return;
      read.add(tag);
    }
  });
  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const outputs = [...write.keys()].sort(byName);
  const inputs = [...read].filter((tag) => !write.has(tag)).sort(byName);
  return {
    inputs,
    outputs,
    writeCounts: Object.fromEntries(write),
    duplicateOutputs: outputs.filter((tag) => write.get(tag) > 1)
  };
}

export function imageFromBits(bits = {}) {
  const state = initialState([]);
  state.bits = {};
  for (const [tag, value] of Object.entries(bits || {})) {
    state.bits[tag] = value ? 1 : 0;
  }
  state.dt = EDITOR_SCAN_MS;
  return state;
}

/** One live scan, top rung to bottom. Mutates bits, timers, and counters. */
export function applyEditorScan(program, state) {
  const errors = validateProgram(program);
  if (errors.length) return { ok: false, errors, conds: [] };
  // Same CTU prescan as the ladder lab. .CU is set true once, before the first
  // scan of a fresh or Reset image, so an input that is already true does not count.
  const ctuTags = [];
  visitInstructions(program, (instr) => {
    if (instr.kind !== 'CTU') return;
    const tag = String(instr.tag ?? '').trim();
    if (!isEditorTag(tag)) return;
    ctuTags.push(tag);
  });
  applyCtuPrescan(state, ctuTags);
  state.dt = EDITOR_SCAN_MS;
  const conds = compileProgram(program).map((ladder) => analyze(ladder, state, { live: true }).conducts);
  return { ok: true, errors: [], conds };
}

/** Edit-tab Step. The button uses this, then applyEditorScan. A program with errors does not scan. */
export function editStepControl(errors) {
  if (Array.isArray(errors) && errors.length > 0) {
    return { disabled: true, reason: 'Step is off until this program can be scanned.' };
  }
  return { disabled: false, reason: '' };
}

function isEngineState(value) {
  return !!(value && typeof value === 'object' && value.bits && value.timers && value.counters);
}

/** Drawing pass. Does not write coils or advance timers. */
export function previewEditor(program, bitsOrState) {
  const state = isEngineState(bitsOrState) ? structuredClone(bitsOrState) : imageFromBits(bitsOrState || {});
  state.dt = 0;
  const before = { ...state.bits };
  const ladders = compileProgram(program);
  const maps = [];
  const conds = [];
  for (const ladder of ladders) {
    const res = analyze(ladder, state, { live: false });
    maps.push(res.map);
    conds.push(res.conducts);
  }
  return { ladders, maps, conds, bits: state.bits, bitsBefore: before, timers: state.timers, counters: state.counters };
}

/**
 * Test helper: each step merges `bits` into the image, then runs one live scan.
 * @param {Array<{bits?: Record<string, number|boolean>}>} steps
 */
export function scanEditor(program, steps) {
  const errors = validateProgram(program);
  if (errors.length) {
    const err = new Error(`program is not valid:\n${errors.map((e) => e.message).join('\n')}`);
    err.errors = errors;
    throw err;
  }
  const state = imageFromBits({});
  const traces = [];
  for (const step of steps) {
    for (const [tag, value] of Object.entries(step?.bits || {})) state.bits[tag] = value ? 1 : 0;
    const res = applyEditorScan(program, state);
    if (!res.ok) {
      const err = new Error('scan refused');
      err.errors = res.errors;
      throw err;
    }
    traces.push({
      bits: { ...state.bits },
      conds: res.conds.slice(),
      timers: structuredClone(state.timers),
      counters: structuredClone(state.counters)
    });
  }
  return { state, traces };
}

function sanitizeInstruction(raw, seen) {
  if (!raw || typeof raw !== 'object') return null;
  if (!KINDS.has(raw.kind)) return null;
  const id = typeof raw.id === 'string' && raw.id && !seen.has(raw.id) ? raw.id : null;
  if (!id) return null;
  seen.add(id);
  const clean = { id, kind: raw.kind, tag: String(raw.tag ?? '').trim() };
  if (PRESET_KINDS.has(raw.kind) && (typeof raw.pre === 'number' || typeof raw.pre === 'string')) clean.pre = raw.pre;
  return clean;
}

export function parseStoredProgram(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.rungs)) return null;
  const seen = new Set();
  const rungs = [];
  for (const rung of data.rungs) {
    if (!rung || typeof rung !== 'object' || typeof rung.id !== 'string' || !rung.id || seen.has(rung.id)) continue;
    seen.add(rung.id);
    const elements = [];
    for (const el of Array.isArray(rung.elements) ? rung.elements : []) {
      if (!el || typeof el !== 'object') continue;
      if (el.kind === 'branch') {
        if (typeof el.id !== 'string' || !el.id || seen.has(el.id) || !Array.isArray(el.legs)) continue;
        seen.add(el.id);
        const legs = [];
        for (const leg of el.legs) {
          if (!Array.isArray(leg)) continue;
          const contacts = [];
          for (const instr of leg) {
            const clean = sanitizeInstruction(instr, seen);
            if (clean && !isOutputKind(clean.kind)) contacts.push(clean);
          }
          legs.push(contacts);
        }
        if (legs.length >= 2) elements.push({ id: el.id, kind: 'branch', legs });
        continue;
      }
      const clean = sanitizeInstruction(el, seen);
      if (clean) elements.push(clean);
    }
    rungs.push({ id: rung.id, elements });
  }
  if (rungs.length === 0) return null;
  let seq = Number.isInteger(data.seq) && data.seq > 0 ? data.seq : 1;
  const maxSeen = seen.size + 1;
  if (seq < maxSeen) seq = maxSeen;
  return { version: 1, seq, rungs };
}

export function loadProgram(storage) {
  try {
    const raw = storage?.getItem?.(EDITOR_STORAGE_KEY);
    if (!raw) return createProgram();
    return parseStoredProgram(raw) ?? createProgram();
  } catch {
    return createProgram();
  }
}

export function saveProgram(program, storage) {
  try {
    storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(program));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Could not save in this browser. The rungs are still on the page, but a reload may lose them.'
    };
  }
}

export function resetStoredProgram(storage) {
  const program = createProgram();
  saveProgram(program, storage);
  return program;
}
