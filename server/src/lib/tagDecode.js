/**
 * ISA-5.1 tag decoder.
 *
 * Pure and rule-based: it splits the tag and resolves each letter against the ISA-5.1 letter
 * tables shipped with this app (server/src/seed/data/isaLetters.js). It never guesses a meaning
 * that is not in a table, and it reports LOW/MEDIUM confidence whenever a letter is one the
 * standard explicitly leaves to "user's choice", or whenever the plant legend would be required.
 *
 * Output shape (consumed by web/src/components/TagDecoder.jsx):
 *   { ok, tag, normalized, prefix, functionLetters, loopNumber, suffix, letters[],
 *     summary, confidence, basis, warnings[] }
 * and each letter: { letter, role, meaning, note, assignedByISA, permissive, entryId }
 */
import { FIRST_LETTERS, SUCCEEDING_LETTERS, LEVEL_QUALIFIERS } from '../seed/data/isaLetters.js';

const FIRST = new Map(FIRST_LETTERS.map((r) => [r.letter, r]));
const SUCC = new Map(SUCCEEDING_LETTERS.map((r) => [r.letter, r]));
const LEVEL = new Map(LEVEL_QUALIFIERS.map((r) => [r.token, r]));

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const firstId = (l) => `isa-letters:first-letter-${slug(l)}`;
const funcId = (l) => `isa-letters:function-letter-${slug(l)}`;
const levelId = (t) => `isa-letters:level-qualifier-${slug(t)}`;

/** Modifier tail tokens ISA-5.1 uses with the level/limit letters, longest first. */
const TAIL_TOKENS = ['HHH', 'LLL', 'HH', 'LL', 'NA', 'H', 'L'];

/**
 * Split a tag into [prefix..., functionLetters, loopNumber, suffix].
 * Accepts: FIC-1234, 12-FIC-1234A, E-FV-305, LIC-201-01, XV-300, PSHH-101, FCV205A.
 */
export function parseTag(input) {
  const raw = String(input ?? '').trim().toUpperCase().replace(/[\s_.]+/g, '');
  if (!raw) return null;
  const parts = raw.split(/[-/]+/).filter(Boolean);

  // the function block is the longest purely-alphabetic part; if none, the leading letters of any part
  let idx = -1;
  let base = '';
  parts.forEach((p, i) => {
    const letters = /^[A-Z]+/.exec(p)?.[0] ?? '';
    if (letters.length > base.length && letters.length >= 2) { base = letters; idx = i; }
    else if (!base && letters.length === 1 && /^[A-Z]$/.test(p)) { base = letters; idx = i; }
  });
  if (!base) return null;

  const tailOfBasePart = parts[idx].slice(base.length);           // e.g. '205A' from 'FCV205A'
  const prefixParts = parts.slice(0, idx);
  const afterParts = [...(tailOfBasePart ? [tailOfBasePart] : []), ...parts.slice(idx + 1)];

  let loopNumber = null;
  let suffix = null;
  const joined = afterParts.join('-');
  const numIn = /(\d+)/.exec(joined);
  if (numIn) {
    loopNumber = numIn[1];
    const before = joined.slice(0, numIn.index).replace(/-+$/, '');
    const after = joined.slice(numIn.index + loopNumber.length).replace(/^-+/, '');
    if (after) suffix = after;
    if (before) suffix = suffix ? `${before}-${suffix}` : before;
  } else if (joined) {
    suffix = joined;
  }

  return {
    normalized: raw,
    prefix: prefixParts.length ? prefixParts : null,
    functionLetters: base,
    loopNumber,
    suffix
  };
}

export function decodeTag(input) {
  const raw = String(input ?? '').trim().toUpperCase();
  const warnings = [];
  if (!raw) return { ok: false, error: 'No tag supplied. Enter something like PT-101 or 12-FCV-205A.' };

  const parsed = parseTag(raw);
  if (!parsed) {
    return { ok: false, error: `No instrument function letters found in "${raw}". A tag readable by this decoder needs an alphabetic block (e.g. FV, PSHH) and, ideally, a loop number.`, tag: raw };
  }
  const { normalized, prefix, functionLetters: base, loopNumber, suffix } = parsed;

  const firstLetter = base[0];
  let remainder = base.slice(1);

  const firstRow = FIRST.get(firstLetter);
  if (!firstRow) warnings.push(`First letter "${firstLetter}" is not in the ISA-5.1 table used by this reference.`);

  // consume modifier/limit tokens from the tail (HH, LL, NA, …) before treating them as function letters
  const tail = [];
  for (const token of TAIL_TOKENS) {
    if (remainder.endsWith(token) && (token.length > 1 || LEVEL.has(token))) {
      tail.unshift(token);
      remainder = remainder.slice(0, -token.length);
      break;
    }
  }
  for (const ch of remainder) {
    if (!SUCC.get(ch)) warnings.push(`Function letter "${ch}" is not in the succeeding-letter table used here. Confirm it against your legend before assuming a function.`);
  }

  const letters = [];
  if (firstRow) {
    letters.push({
      letter: firstLetter,
      role: 'measured variable',
      meaning: firstRow.variable,
      note: firstRow.note ?? '',
      assignedByISA: !firstRow.permissive,
      permissive: !!firstRow.permissive,
      basis: firstRow.permissive ? 'ISA-5.1: user\u2019s choice' : 'ISA-5.1 first-letter table',
      entryId: firstId(firstLetter)
    });
  } else {
    letters.push({ letter: firstLetter, role: 'measured variable', meaning: 'not in this table', note: '', assignedByISA: false, permissive: false, basis: 'unmatched' });
  }

  for (const ch of remainder) {
    const row = SUCC.get(ch);
    letters.push({
      letter: ch,
      role: 'function',
      meaning: row ? row.function : 'unknown',
      note: row?.note ?? '',
      assignedByISA: !!row && !row.permissive,
      permissive: !!row?.permissive,
      kind: row?.kind ?? '',
      basis: row ? (row.permissive ? 'ISA-5.1: user\u2019s choice' : 'ISA-5.1 succeeding-letter table') : 'unmatched',
      ...(row ? { entryId: funcId(ch) } : {})
    });
  }

  for (const tok of tail) {
    const row = LEVEL.get(tok) ?? LEVEL.get(tok[0]);
    letters.push({
      letter: tok,
      role: 'limit / modifier',
      meaning: row?.meaning ?? 'unknown',
      note: row?.note ?? '',
      assignedByISA: !!row,
      permissive: false,
      basis: row ? 'ISA-5.1 modifier / limit letters' : 'unmatched',
      ...(row ? { entryId: levelId(tok) } : {})
    });
  }

  const permissiveUsed = letters.filter((l) => l.permissive);
  const unknownUsed = letters.filter((l) => !l.assignedByISA);

  // prefix decoding: numeric parts are area/unit codes, letters may be plant/area codes
  const prefixInfo = (prefix || []).map((p) => (/^\d+$/.test(p)
    ? { token: p, kind: 'area / unit number', meaning: 'Loop-area or unit prefix: which unit the loop belongs to. The numbering scheme is a project convention.' }
    : { token: p, kind: 'letter prefix', meaning: `Prefix letters ${p.length === 1 ? 'is' : 'are'} not interpreted by this app. Plant/area/service prefixes are set by the project, not by ISA-5.1.` }));

  const summaryParts = letters.filter((l) => l.assignedByISA && l.meaning !== 'unknown').map((l) => l.meaning);
  const summary = summaryParts.length
    ? summaryParts.join(' · ')
    : 'Letters present, but none of them are assigned a meaning by the ISA-5.1 table used here.';

  let confidence = 'high';
  if (permissiveUsed.length) confidence = 'medium';
  if (unknownUsed.length) confidence = 'low';

  if (!loopNumber) warnings.push('No loop number found. The loop number is what ties a device to its loop, its I/O and its documents - add it before using this read-out on a work order.');
  if (permissiveUsed.length) {
    warnings.push(`${permissiveUsed.map((l) => l.letter).join(', ')} ${permissiveUsed.length > 1 ? 'are' : 'is'} assigned to "user\u2019s choice" by ISA-5.1. This reference will not assert a meaning for ${permissiveUsed.length > 1 ? 'them' : 'it'} - read your plant\u2019s tag register or P&ID legend.`);
  }
  if (suffix) warnings.push(`Trailing "${suffix}" was not interpreted. Suffixes are project conventions (redundant channel, series, board number, revision, valve trim code); check the legend before assuming two tags are the same device.`);
  for (const p of prefixInfo) if (p.kind === 'letter prefix') warnings.push(`${p.token}: ${p.meaning}`);

  return {
    ok: true,
    tag: raw,
    normalized,
    prefix: prefixInfo,
    functionLetters: base,
    loopNumber: loopNumber || null,
    suffix: suffix || null,
    letters,
    summary,
    confidence,
    warnings,
    basis: 'ANSI/ISA-5.1 first-letter (measured or initiating variable) and succeeding-letter (final function + modifiers) convention, as tabulated in the "Tag letters" section of this reference. Symbols and detailed rules live in the standard itself.'
  };
}

/** Convenience: decode a whole list of tags (used by the "common tags" reference table). */
export function decodeMany(tags = []) {
  return tags.map((t) => {
    const d = decodeTag(t);
    return {
      tag: t,
      ok: !!d.ok,
      summary: d.summary ?? '',
      confidence: d.confidence ?? 'low',
      letters: d.letters?.map((l) => l.letter).join('') ?? '',
      loopNumber: d.loopNumber ?? null,
      warnings: d.warnings ?? [],
      error: d.error
    };
  });
}
