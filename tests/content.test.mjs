/**
 * Content-policy tests: the rules that make this reference safe to read.
 *
 *   node --test tests/
 *
 * These check the *discipline*, not the facts: provenance on every entry, no paywalled text
 * reproduced as a paraphrase, tuning and example numbers labelled as what they are, site-specific
 * claims pointed back at the plant documents, and no invented process values anywhere. If a future
 * edit weakens one of these, the entry it belongs to should change, not this file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEntries, SECTIONS } from '../server/src/seed/index.js';

const ENTRIES = buildEntries();
const STATUSES = new Set(['standard', 'practice', 'vendor', 'site-specific', 'unverified', 'illustrative-example']);

const textOf = (e) => [e.title, e.subtitle, e.body, e.search].filter(Boolean).join(' ');

test('the seed builds and every entry lands in a declared section', () => {
  assert.ok(ENTRIES.length > 600, `expected the full reference set, got ${ENTRIES.length}`);
  const slugs = new Set(SECTIONS.map((s) => s.slug));
  for (const e of ENTRIES) {
    assert.ok(slugs.has(e.section), `${e.id} points at unknown section ${e.section}`);
    assert.ok(e.id.startsWith(`${e.section}:`), `${e.id} is not namespaced by its section`);
    assert.ok(e.title && e.title.length >= 1, `${e.id} has no title`);
    if (e.section === 'isa-letters') {
      assert.ok(String(e.title).length <= 4, `${e.id}: an ISA letter row is titled by its letter`);
      assert.ok(e.subtitle, `${e.id}: a letter row must state what the standard leaves or assigns`);
    }
    assert.ok(e.kind, `${e.id} has no kind`);
  }
  const ids = new Set(ENTRIES.map((e) => e.id));
  assert.equal(ids.size, ENTRIES.length, 'entry ids must be unique');
});

test('every entry carries a provenance status and at least one source pointer', () => {
  for (const e of ENTRIES) {
    assert.ok(STATUSES.has(e.status), `${e.id} has unusable status "${e.status}"`);
    assert.ok(Array.isArray(e.sources) && e.sources.length >= 1, `${e.id} ships without a source pointer`);
    for (const s of e.sources) {
      assert.ok(s && typeof s.label === 'string' && s.label.length > 8, `${e.id} has a source with no document named`);
      if (s.url) assert.match(s.url, /^https?:\/\//, `${e.id} has a malformed source url`);
    }
  }
});

test('every entry is readable on its own, not only a title with a pointer', () => {
  const silent = [];
  for (const e of ENTRIES) {
    // lookup rows (acronyms, ISA letters) are one line by design: title + what it stands for
    if (/(^|-)acronym$/.test(e.kind) || e.kind.endsWith('-letter') || e.kind === 'level-qualifier') {
      assert.ok((e.subtitle || '').trim().length >= 3, `${e.id}: the expansion is the whole entry and it is missing`);
      continue;
    }
    if (['conversion', 'formula', 'reference'].includes(e.kind)) {
      const vals = Object.values(e.payload);
      const carriesIt = vals.some((v) => typeof v === 'number') || vals.some((v) => typeof v === 'string' && v.length >= 12);
      assert.ok(carriesIt, `${e.id}: a ${e.kind} row must carry the factor or expression itself, not just a name`);
      continue;
    }
    const prose = `${e.body || ''} ${e.subtitle || ''}`.trim();
    // payload counts as prose too: conversion rows, table rows and rungs put their content there
    const payloadText = Object.values(e.payload).filter((v) => typeof v === 'string' && v.length >= 12).join(' ');
    if (prose.length < 20 && payloadText.length < 20) silent.push(`${e.id} (${e.kind})`);
  }
  assert.deepEqual(silent, [], 'these entries say nothing beyond their title');
});

test('the badge describes the evidence on the row: no strong badge on a section-basis pointer', () => {
  for (const e of ENTRIES) {
    for (const src of e.sources || []) {
      assert.ok(String(src.label || '').length >= 18, `${e.id}: source pointer "${src.label}" is too thin to be checkable`);
    }
    const perRow = Array.isArray(e.payload.sources) && e.payload.sources.length > 0;
    const basisOnly = (e.sources || []).length > 0 && e.sources.every((x) => x.basisOnly);
    if (e.status === 'standard') {
      assert.ok(!basisOnly || perRow, `${e.id}: badged "standard" while its only pointer admits it is a section basis`);
    }
    // and the inverse direction: a strong badge on an acronym needs the document the row names
    if (e.section === 'acronyms' && e.status === 'standard' && !perRow) {
      assert.match(String(e.sources[0]?.label || ''), /designation itself/,
        `${e.id}: a standard-badged acronym must cite the document it names`);
    }
  }
});

test('example rungs are badged as authored examples and say the numbers are placeholders', () => {
  const rungs = ENTRIES.filter((e) => e.section === 'rungs');
  assert.equal(rungs.length, 16);
  for (const e of rungs) {
    assert.equal(e.status, 'illustrative-example', `${e.id} is not badged as an authored example`);
    assert.match(e.payload.exampleNotice || '', /not a design value/i, `${e.id} is missing the design-value disclaimer`);
    assert.match(e.payload.exampleNotice || '', /invented/i, `${e.id} must say the tags are invented`);
  }
});

test('tuning methods are marked as published relations, not standards, and carry the warning', () => {
  const tuning = ENTRIES.filter((e) => e.section === 'pid' && e.kind === 'tuning');
  assert.ok(tuning.length >= 5);
  for (const e of tuning) {
    assert.notEqual(e.status, 'standard', `${e.id}: a tuning rule from the literature is practice, not a standard`);
    assert.match(e.payload.tableNotice || '', /NOT design values/i, `${e.id} is missing the "not design values" warning`);
  }
});

test('site-specific entries send the reader back to the plant documents', () => {
  const siteSpecific = ENTRIES.filter((e) => e.status === 'site-specific');
  assert.ok(siteSpecific.length > 0, 'the reference should contain some site-specific rows');
  for (const e of siteSpecific) {
    assert.match(textOf(e), /confirm|verify|check|your plant|tag register|P&ID|legend|spec|matrix|datasheet/i,
      `${e.id} is site-specific but never tells the reader what to check`);
  }
});

test('unverified entries say so in the body, not only in the badge', () => {
  for (const e of ENTRIES.filter((x) => x.status === 'unverified')) {
    assert.match(textOf(e), /unverified|not verified|could not be (?:checked|verified)|primary source|verify/i,
      `${e.id} carries the badge but the text reads as fact`);
  }
});

test('letters ISA-5.1 leaves to the user are not given a single meaning', () => {
  const letters = ENTRIES.filter((e) => e.section === 'isa-letters' && /user/i.test(String(e.subtitle) + String(e.payload.function || '')));
  assert.ok(letters.length >= 8, 'the table must include the user-choice letters, first and function');
  for (const e of letters) {
    assert.equal(e.payload.permissive, true, `${e.id} must be flagged permissive`);
    assert.match(textOf(e), /user|register|legend|confirm/i, `${e.id} must point at the plant legend`);
  }
  const choices = ENTRIES.filter((e) => e.section === 'isa-letters' && e.payload.permissive === true);
  for (const e of choices) {
    assert.doesNotMatch(String(e.payload.variable || ''), /^(Conductivity|Density|Differential|Time|Force|Speed|Frequency)$/,
      `${e.id} asserts one meaning for a letter the standard leaves to the user`);
  }
});

test('the standards index describes scope and never reproduces content', () => {
  const standards = ENTRIES.filter((e) => e.section === 'standards' && e.kind !== 'methodology');
  assert.ok(standards.length >= 25);
  for (const e of standards) {
    assert.ok(e.payload.scope, `${e.id} has no scope statement`);
    assert.doesNotMatch(`${e.payload.scope} ${e.body}`, /shall be not less than|the text of the standard says|clause \d+\.\d+/,
      `${e.id} looks like it is quoting a standard; keep it to scope`);
  }
});

test('no plant operating numbers: nothing is presented as a setpoint, trip or relief value', () => {
  const forbidden = /\b(set\s?point|trip (?:point|level|value)|alarm (?:set|limit|point)|relief (?:set|pressure)|design pressure|MAWP)\s*(?:of|is|at|:|=)?\s*[-+]?\d+(\.\d+)?\s*(psi|psig|psia|kPa|MPa|bar|°?F|deg ?F|%)/i;
  const hits = ENTRIES.filter((e) => forbidden.test(textOf(e)));
  assert.deepEqual(hits.map((e) => `${e.id}: ${textOf(e).match(forbidden)?.[0]}`), [],
    'these entries state a numeric process/safety value; definitional arithmetic only is allowed');
});

test('definitional arithmetic that IS allowed stays definitional', () => {
  const must = [
    ['units:r-kcpb', /100\s*\/\s*PB|Kc = 100/i],
    ['units:c-psia-offset', /14\.696/]
  ];
  const byId = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));
  for (const [id, re] of must) {
    assert.ok(byId[id], `${id} disappeared from the seed`);
    assert.match(textOf(byId[id]), re, `${id} should carry the definitional relation`);
  }
});

test('search blobs are indexed for the words readers actually type', () => {
  const hay = ENTRIES.map((e) => e.search || '');
  assert.ok(hay.every(Boolean), 'every entry needs a search blob');
  for (const word of ['surge', 'stiction', 'fail-safe', 'amine', 'seal-in', 'otl', 'psia', 'hart', '2oo3', 'mawp']) {
    assert.ok(hay.some((h) => h.toLowerCase().includes(word)), `"${word}" is unsearchable`);
  }
});

test('sections are all populated and grouped for the sidebar', () => {
  const groups = new Set(SECTIONS.map((s) => s.group));
  assert.equal(groups.size, 4, 'four nav groups: Reference, Ladder logic, Control, Tools');
  const counts = Object.fromEntries(SECTIONS.map((s) => [s.slug, 0]));
  for (const e of ENTRIES) counts[e.section]++;
  for (const [slug, n] of Object.entries(counts)) assert.ok(n >= 12, `section ${slug} has only ${n} entries`);
});
