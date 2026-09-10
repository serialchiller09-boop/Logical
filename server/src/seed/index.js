/**
 * Seed pipeline: turns the authored datasets into flat, searchable entries.
 * Nothing here invents content - it only promotes a few fields to columns so the UI
 * can render cards without parsing, and keeps the whole record in `payload`.
 */
import { SECTIONS } from './sections.js';
import { FIRST_LETTERS, SUCCEEDING_LETTERS, LEVEL_QUALIFIERS } from './data/isaLetters.js';
import { ACRONYMS } from './data/acronyms.js';
import { VALVE_TYPES, VALVE_ACRONYMS, ACTUATORS, VALVE_ACCESSORIES, VALVE_TERMS, VALVE_PRACTICE } from './data/valves.js';
import { INSTRUMENTS, SIGNAL_TYPES } from './data/instruments.js';
import { DATA_TYPES, TYPE_RULES } from './data/datatypes.js';
import { LADDER_BASICS, INSTRUCTIONS } from './data/instructions.js';
import { RUNGS } from './data/rungs.js';
import { RUNGS2 } from './data/rungs2.js';
import { FUNCTION_BLOCKS, FB_FAMILIES } from './data/functionBlocks.js';
import { PID_TERMS, TUNING_METHODS, GAS_PLANT_LOOPS } from './data/pid.js';
import { PROCESS_STAGES } from './data/process.js';
import { EQUIPMENT } from './data/equipment.js';
import { SAFETY_PRINCIPLES, ESD_LEVELS, TRIP_TESTING } from './data/safety.js';
import { UNIT_DEFS, CONVERSIONS, DERIVED_RELATIONS, REFERENCE_CONDITIONS } from './data/units.js';
import { STANDARDS, METHODOLOGY } from './data/standards.js';
import { defaultSources } from './sources.js';

/** Stamped onto every tuning-method entry: the tables are the published relations, and the
 *  numbers in them are not allowed to look like a recommendation. */
export const TUNING_NOTICE = 'These are the published tuning relations themselves, restated for reading and comparison. They are NOT design values, and they are not a starting point you may apply to a live loop: what any of these numbers can be depends on the final control element and its installed characteristic, the measurement noise and dead time, and how much excursion operations will accept. A loop is set by a documented process test, reviewed and recorded under management of change.';

/** Stamped onto every example rung by the normalizer, so a rung can never ship without the
 *  disclaimer that its numbers are teaching scaffolding. Plant-authored rungs inherit it too. */
export const RUNG_NOTICE = 'Authored for this app as a teaching example. The tags are invented and every preset, limit, deadband, target and address is a placeholder - not a design value and not a starting point for yours. The structure is what to copy; the numbers must come from your cause-and-effect matrix, alarm philosophy, valve datasheet and loop test.';

const USER_CHOICE_RE = /user'?s? choice|no standard assignment|assigned by the user|left to the user/i;
const DOC_DESIGNATION_RE = /\b(AGA|API|ASME|ASTM|AWS|ANSI|BS|DIN|EN|IEC|ISO|ISA|NFPA|NACE|OSHA|UL|GPA|TEMA|EPA|FM|UL)\s*-?\s*(RP\s*)?(Std\.?\s*)?(No\.?\s*)?\d/i;

const TITLE_KEYS = ['title', 'term', 'tag', 'mnemonic', 'name', 'letter', 'token', 'code', 'unit', 'block', 'loop', 'stage', 'test', 'method'];
const SUBTITLE_KEYS = ['subtitle', 'oneLine', 'expansion', 'fullName', 'full', 'name', 'variable', 'function', 'meaning', 'family', 'group', 'category'];
const BODY_KEYS = ['body', 'definition', 'principle', 'summary', 'purpose', 'note', 'use', 'why', 'behaviour', 'function', 'expansion', 'meaning', 'scope', 'consequence', 'rule', 'how', 'what', 'drivenBy', 'strengths', 'warning', 'caution', 'fieldTruth', 'winterTruth', 'notes', 'throttling', 'typical', 'limits', 'failsafe', 'needs', 'whatFor', 'overview', 'summaryLine'];

function candidates(raw, keys, skip = new Set()) {
  const out = [];
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim() && !skip.has(v.trim())) out.push(v.trim());
  }
  return out;
}

function pickFirst(list) { return list[0] ?? ''; }

/** Flatten every authored string (and every field name) into the search haystack, so a query
 *  can hit a nested note, a table row or a source label - not just the card title. */
function harvest(value, out, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') { out.push(value); return; }
  if (typeof value === 'number' || typeof value === 'boolean') { out.push(String(value)); return; }
  if (Array.isArray(value)) { for (const v of value) harvest(v, out, depth + 1); return; }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'ladder' || k === 'payload' || k === 'search') continue;
      out.push(k.replace(/([A-Z])/g, ' $1').toLowerCase());
      harvest(v, out, depth + 1);
    }
  }
}

const slug = (str) => String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function toEntry(section, kind, raw, index = 0) {
  // stable, readable id: prefer an authored id, otherwise derive from the title
  const base = raw.id ?? `${kind}:${raw.title || raw.term || raw.tag || raw.letter || raw.token || raw.name || index}`;
  let id = `${section}:${slug(base) || `${kind}-${index}`}`;

  let title = pickFirst(candidates(raw, TITLE_KEYS));
  const used = new Set();

  // conversions have no natural title field: render "from -> to"
  if (raw.from && raw.to) title = `${raw.from} \u2192 ${raw.to}`;
  if (!title) title = raw.id || id;

  const subtitle = pickFirst(candidates(raw, SUBTITLE_KEYS, new Set([title])));
  if (subtitle) used.add(subtitle);
  const body = pickFirst(candidates(raw, BODY_KEYS, used));

  const tags = Array.isArray(raw.tags) ? raw.tags : (raw.category ? [raw.category] : []);
  const haystack = [title, subtitle, body, kind, ...tags];
  harvest(raw, haystack);
  const search = [...new Set(haystack.filter(Boolean).map((s) => String(s).toLowerCase()))].join(' \u2022 ');

  let payload = raw;
  if (section === 'rungs') payload = { ...payload, exampleNotice: raw.exampleNotice || RUNG_NOTICE };
  if (section === 'pid' && kind === 'tuning') payload = { ...payload, tableNotice: raw.tableNotice || TUNING_NOTICE };
  // ISA-5.1 leaves several letters to the user. Whatever the data says, a row that describes itself
  // that way must be flagged, so the UI can refuse to present the field habit as an assignment.
  if (section === 'isa-letters' && USER_CHOICE_RE.test(`${raw.variable ?? ''} ${raw.function ?? ''} ${raw.note ?? ''}`)) {
    payload = { ...payload, permissive: true };
  }

  let sources = Array.isArray(raw.sources) && raw.sources.length ? raw.sources : defaultSources(section, kind);
  const ownSources = Array.isArray(raw.sources) && raw.sources.length > 0;

  // Where an acronym IS a document designation, cite the designation itself and nothing else: it is
  // the only attribution that cannot be wrong, and no content from the document is claimed.
  if (section === 'acronyms' && !ownSources && DOC_DESIGNATION_RE.test(String(raw.term || ''))) {
    sources = [{ label: `${String(raw.term).replace(/\s+/g, ' ').trim()} - the acronym is the document designation itself; this row states only what that document covers, in plant terms. No text from it is reproduced here.` }, ...sources];
  }

  // The badge describes the evidence THIS ROW carries, not the subject's importance. An acronym may
  // only claim `standard` when a document is named on the row; industry vocabulary is `practice`.
  // (Section defaults are basis notes for a whole section - never an excuse for a strong badge.)
  let status = raw.status || 'practice';
  const isDesignation = section === 'acronyms' && DOC_DESIGNATION_RE.test(String(raw.term || ''));
  // A row citing ONLY a note that admits it is a section basis may not claim "standard": the badge
  // describes the evidence on that row. Rows whose section default names the document they define
  // (ISA-5.1 letters, IEC 61131-3 types, a vendor instruction set) keep what the author gave them.
  const basisOnly = sources.length > 0 && sources.every((x) => x.basisOnly);
  if (!ownSources && !isDesignation && basisOnly && status === 'standard') status = 'practice';

  return {
    id,
    section,
    kind,
    title,
    subtitle,
    body,
    status,
    tags,
    // an entry without its own citation inherits the section's named documents, so no
    // claim in this reference travels without a pointer to what it was read from
    sources,
    payload,
    search
  };
}

function group(section, kind, list, sortFn) {
  const arr = list || [];
  const sorted = sortFn ? [...arr].sort(sortFn) : arr;
  return sorted.map((raw, i) => toEntry(section, kind, raw, i));
}

/** Full seed set, in nav order. Deterministic: no randomness, no timestamps from Date.now(). */
export function buildEntries() {
  const all = [
    ...group('acronyms', 'acronym', ACRONYMS, (a, b) => a.term.localeCompare(b.term)),
    ...group('valves', 'valve-type', VALVE_TYPES),
    ...group('valves', 'valve-acronym', VALVE_ACRONYMS),
    ...group('valves', 'actuator', ACTUATORS),
    ...group('valves', 'accessory', VALVE_ACCESSORIES),
    ...group('valves', 'term', VALVE_TERMS),
    ...group('valves', 'practice', VALVE_PRACTICE),
    ...group('instruments', 'instrument', INSTRUMENTS),
    ...group('instruments', 'signal', SIGNAL_TYPES),
    ...group('isa-letters', 'first-letter', FIRST_LETTERS),
    ...group('isa-letters', 'function-letter', SUCCEEDING_LETTERS),
    ...group('isa-letters', 'level-qualifier', LEVEL_QUALIFIERS),
    ...group('datatypes', 'type', DATA_TYPES),
    ...group('datatypes', 'rule', TYPE_RULES),
    ...group('instructions', 'concept', LADDER_BASICS),
    ...group('instructions', 'instruction', INSTRUCTIONS),
    ...group('rungs', 'rung', RUNGS),
    ...group('rungs', 'rung', RUNGS2),
    ...group('function-blocks', 'block', FUNCTION_BLOCKS),
    ...group('function-blocks', 'family', FB_FAMILIES),
    ...group('pid', 'term', PID_TERMS),
    ...group('pid', 'tuning', TUNING_METHODS),
    ...group('pid', 'loop', GAS_PLANT_LOOPS),
    ...group('process', 'stage', PROCESS_STAGES, (a, b) => (a.order ?? 0) - (b.order ?? 0)),
    ...group('equipment', 'equipment', EQUIPMENT),
    ...group('safety', 'principle', SAFETY_PRINCIPLES),
    ...group('safety', 'esd', ESD_LEVELS),
    ...group('safety', 'test', TRIP_TESTING),
    ...group('units', 'definition', UNIT_DEFS),
    ...group('units', 'conversion', CONVERSIONS),
    ...group('units', 'formula', DERIVED_RELATIONS),
    ...group('units', 'reference', REFERENCE_CONDITIONS),
    ...group('standards', 'standard', STANDARDS),
    ...group('standards', 'methodology', METHODOLOGY)
  ];

  const seen = new Map();
  for (const e of all) {
    const n = (seen.get(e.id) ?? 0) + 1;
    seen.set(e.id, n);
    if (n > 1) e.id = `${e.id}-${n}`;
  }
  return all;
}

export { SECTIONS };
