/**
 * Section-level provenance pointers.
 *
 * Every entry must show WHERE its content came from. Individual entries carry their own
 * `sources` when the claim is narrow (a specific table, a specific vendor manual); for
 * entries that do not, the section default below is attached, so nothing ships as an
 * unsourced assertion.
 *
 * Rules obeyed here:
 *  - a URL is attached only where that page was actually read while building this data;
 *    otherwise the document is named without a link, because a plausible-but-unverified URL
 *    is a fabricated citation and worse than none;
 *  - scope summaries are not quotations - the named document remains the authority.
 */

const ISA51 = [
  { label: 'ANSI/ISA-5.1 - Instrumentation Symbols and Identification: identification letters (the standard is the authority; this app reproduces none of it)' },
  { label: 'ISA-5.1 first-letter and succeeding-letter tables, as tabulated publicly', url: 'https://tagsight.io/isa' },
  { label: 'ISA-5.1 overview and letter lists', url: 'https://pathnovo.com/standards/isa-5-1' }
];

export const SECTION_SOURCES = {
  'isa-letters': ISA51,

  // An acronym is not a standardized fact, and no single document owns this table: the pointers
  // below say what class of material the section was compiled against, and are deliberately not
  // presented as the citation for an individual row. Where an acronym IS a document designation
  // (AGA-7, API 14C, IEC 61131-3 ...) the normalizer attaches a pointer to that document instead.
  acronyms: [
    { basisOnly: true, label: 'Section basis, not a per-row citation: compiled from public industry usage - vendor manuals, instrument and metering references, and the letter conventions behind ANSI/ISA-5.1 symbols and API RP 14C / ISO 10418 safety-valve acronyms. Confirm any expansion against the plant documents that use it; where this app and your legend disagree, your legend wins.' }
  ],

  valves: [
    { label: 'ANSI/ISA-5.1 - valve and actuator symbols; fail-open/fail-closed notation' },
    { label: 'ANSI/FCI 70-2 (formerly ANSI/ISA-B16.104) - control valve seat leakage classes I-VI' },
    { label: 'API Std 598 / 527 - valve shell and seat closure testing' },
    { label: 'Actuator spring direction, stroke time, torque sizing with 100% spring-torque margin at the compressed state, and fire tests (API Std 607 / API 6FA / ISO 10497 / BS 6755)', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' },
    { label: 'API RP 14C: FSV versus NRV and verifiable closure', url: 'https://industrialmonitordirect.com/blogs/knowledgebase/api-14c-fsv-vs-nrv-placement-alternative-configuration-compliance' }
  ],

  instruments: [
    { label: 'ANSI/ISA-5.1 - instrument symbols, bubble notation, measured-variable first letter' },
    { label: '4-20 mA loop and HART fundamentals on a two-wire transmitter', url: 'https://transmittershop.com/' },
    { label: 'Level technology comparison (radar, guided wave radar, ultrasonic, dP, displacer) as published by instrumentation suppliers', url: 'https://www.bcstgroup.com/' },
    { label: 'Thermowell wake-frequency and strength evaluation: ASME PTC 19.3' }
  ],

  datatypes: [
    { label: 'IEC 61131-3 - elementary data types: names, sizes, ranges and literal forms', url: 'https://engineer.plcnext.help/knowledge/elementarydatatypes' },
    { label: 'Data types as documented for an embedded IEC 61131-3 runtime (defaults, TIME limits are platform-dependent)', url: 'https://www.ironplc.com/reference/language/data-types' },
    { label: 'Vendor capacity rules (e.g. Logix STRING/ARRAY element capacity) are documented in the vendor manual, not by IEC 61131-3' }
  ],

  instructions: [
    { label: 'Rockwell SLC 500 / MicroLogix Instruction Set Reference, publication 1747-RM001 - XIC/XIO, OTE/OTL/OTU, ONS, TON/TOF/RTO, RES', url: 'https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1747-rm001_-en-p.pdf' },
    { label: 'Rockwell PLC-5 Instruction Set Reference, publication 1785-RM001 - scan order and rung execution', url: 'https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1785-rm001_-en-p.pdf' },
    { label: 'Ladder symbol conventions and the Rockwell-to-IEC element mapping', url: 'https://plcprogramming.io/ladder-logic-symbols-complete-guide' }
  ],

  'function-blocks': [
    { label: 'IEC 61131-3 - standard function blocks: TON/TOF/TP, CTU/CTD/CTUD, RE_SED, arithmetic, selection, comparison, CONVERT, SCALE_X/NORM_X, PID and its response characteristics' },
    { label: 'Vendor realisation of the block set (pin names, member names and update behaviour are vendor-specific)', url: 'https://plcprogramming.io/ladder-logic-symbols-complete-guide' }
  ],

  rungs: [
    { label: 'Original teaching examples authored for this app. Structure follows IEC 61131-3 semantics and documented vendor ladder behaviour; every tag, preset, limit and deadband is an invented placeholder.' }
  ],

  pid: [
    { label: 'Ziegler-Nichols, Cohen-Coon and IMC tuning relations as published in open instrumentation references', url: 'https://instrumentationblog.in/pid-controller-tuning-guide/' },
    { label: 'Proportional band, controller gain and loop-type guidance', url: 'https://www.apmonitor.com/pdc/' },
    { label: 'Anti-windup (back-calculation), derivative kick, bumpless transfer: implementation notes published by control-equipment vendors' },
    { label: 'Loop closed/on control and cascade structure described in vendor application literature' }
  ],

  process: [
    { label: 'Gas processing stage definitions and stream names as published by regulators and operator references', url: 'https://www.alberta.ca/' },
    { label: 'Penn State gas processing course notes (separation, absorption, cryogenic expansion, contamination removal)', url: 'https://www.e-education.psu.edu/fsc432/' },
    { label: 'Amine treating and TEG dehydration described by operators and licensors; solvent and reboiler limits are equipment-specific and must come from the licensor datasheet' }
  ],

  equipment: [
    { label: 'API Std 617 / 618 / 619 / 612 - compressor and expander scope statements (named for scope, not quoted)' },
    { label: 'API Std 670 - machinery protection systems' },
    { label: 'API Std 6D / 600 / 608 / 609 - pipeline and piping valves' },
    { label: 'IEC 60079 series and NFPA 70 Articles 500-505 - protection types and area classification concepts' }
  ],

  safety: [
    { label: 'IEC 61508 (base standard for E/E/PE safety-related systems) and IEC 61511 / ANSI-ISA 84 (process-sector application standard) - named for scope and lifecycle role; no clause text is reproduced here' },
    { label: 'API RP 14C / ISO 10418 - surface safety system configurations and the safety valve family' },
    { label: 'OSHA 29 CFR 1910.119 (PSM) - management of change, pre-startup safety review and PHA as the governing route for logic and setpoint changes' },
    { label: 'NFPA 70E - electrical safe work practices (approach boundaries, arc flash risk assessment)' }
  ],

  units: [
    { label: 'Definitional arithmetic: SI multiples; 1 psi = 6.894757293168 kPa from 1 lbf = 4.4482216152605 N and 1 in = 25.4 mm; 1 bar = 100 kPa', url: 'https://physics.nist.gov/cuu/pdf/sp811.pdf' },
    { label: 'AGA Report No. 3 / API MPMS Chapter 3 - orifice metering equations and the basis terms they require' },
    { label: 'GPA 2172 / API MPMS 14.5 and ISO 12213 - heating value, Wobbe index and compressibility from composition' }
  ],

  standards: [
    { label: 'Each entry names its own document. The scope text is a summary written for this app, not a quotation, and editions/change sheets are yours to confirm.' }
  ]
};

/** Sharper pointers where a whole `kind` traces to one specific document. */
export const KIND_SOURCES = {
  'instructions:concept': [
    { label: 'IEC 61131-3 languages (LD/FBD/ST/SFC) and the vendor execution model: scan, rung-by-rung, left-to-right', url: 'https://plcprogramming.io/ladder-logic-symbols-complete-guide' }
  ],
  'instructions:instruction': [
    { label: 'Rockwell SLC 500 / MicroLogix Instruction Set Reference 1747-RM001', url: 'https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1747-rm001_-en-p.pdf' }
  ],
  'isa-letters:first-letter': ISA51,
  'isa-letters:function-letter': ISA51,
  'isa-letters:level-qualifier': ISA51,
  'rungs:rung': [
    { label: 'Authored for this reference. The bundled simulator is a simplified virtual-tick scan model, not a controller runtime.' }
  ],
  'units:conversion': [
    { label: 'Conversion factors follow from the definitions of the units; no plant data is involved', url: 'https://physics.nist.gov/cuu/pdf/sp811.pdf' }
  ],
  'pid:tuning': [
    { label: 'Published classroom/open references for Ziegler-Nichols, Cohen-Coon, Ziegler open-loop and IMC relations. These are starting points for a tuning test, NOT design values.', url: 'https://instrumentationblog.in/pid-controller-tuning-guide/' }
  ]
};

export function defaultSources(section, kind) {
  return KIND_SOURCES[`${section}:${kind}`] ?? SECTION_SOURCES[section] ?? [];
}
