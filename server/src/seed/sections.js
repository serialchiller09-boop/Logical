/** Section registry: order, grouping, icon and one-line blurb drive the nav and the home screen. */
export const SECTIONS = [
  {
    slug: 'acronyms', label: 'Acronyms', group: 'Reference', icon: 'A', sort: 1,
    blurb: 'Gas plant and automation abbreviations, each with what it means on a P&ID, in a spec, or in conversation.',
    long: 'Twenty categories in one alphabet. Where a term is company convention rather than standard, the entry says so - because the dangerous acronyms are the ones everyone assumes mean the same thing.'
  },
  {
    slug: 'valves', label: 'Valves & actuators', group: 'Reference', icon: 'V', sort: 2,
    blurb: 'Valve bodies, service acronyms (SDV, BDV, FCV, MOV...), actuators, fail-safe logic, accessories and sizing terms.',
    long: 'The part of the plant the logic has to move. Organised as body types, tag acronyms, actuators and fail actions, accessories, specification terms, and the field practice that decides whether a trip actually happens.'
  },
  {
    slug: 'instruments', label: 'Transmitters & analysers', group: 'Reference', icon: 'T', sort: 3,
    blurb: 'Pressure, level, flow, temperature, analysis and machinery instruments - principle, strengths, and how each one lies.',
    long: 'Plus the signal layer: AI/AO/DI/DO, live zero, scan-time limits, isolation, intrinsic safety. A controls person needs the failure mode more often than the datasheet.'
  },
  {
    slug: 'isa-letters', label: 'ISA-5.1 letters', group: 'Reference', icon: 'L', sort: 4,
    blurb: 'The measured-variable and function letters that make a tag readable, plus the level qualifiers.',
    long: 'First letters, succeeding letters, modifiers, and the high/HH/low/LL convention - with the letters ISA-5.1 explicitly leaves to "user\'s choice" flagged as such, because that is where tag-reading goes wrong.'
  },
  {
    slug: 'datatypes', label: 'Data types', group: 'Ladder logic', icon: '#', sort: 5,
    blurb: 'IEC 61131-3 elementary and derived types with sizes, ranges, defaults, and the Logix/Siemens names.',
    long: 'The eight rules that prevent the classic faults (overflow, float equality, truncation, byte order, retentivity) are part of the section, because types are where plant programs quietly break.'
  },
  {
    slug: 'instructions', label: 'Ladder elements', group: 'Ladder logic', icon: '->', sort: 6,
    blurb: 'Contacts, coils, edge detection, timers, counters, compares, math, program control - with IEC and Siemens equivalents.',
    long: 'Preceded by the eight concepts that make a rung readable (scan cycle, power flow, series=AND, XIO is not a field NC contact, de-energize to trip). Then every instruction with its members, its use in a gas plant, and the defect it causes when misused.'
  },
  {
    slug: 'rungs', label: 'Example rungs', group: 'Ladder logic', icon: '|=|', sort: 7,
    blurb: 'Sixteen gas plant rungs drawn as vector diagrams - and runnable in a scan simulator.',
    long: 'Seal-in, latch/acknowledge, 2oo3 voting, restart lockout, run-on timers, stroke counting, alarm deadbands, J-T permissives, purge-before-ignition, first-out capture, anti-surge, lead/lag, analog scaling, and a step sequencer. Each one: what it does, how to read it, and the defects it hides.'
  },
  {
    slug: 'function-blocks', label: 'Function blocks', group: 'Ladder logic', icon: '[ ]', sort: 8,
    blurb: 'The IEC standard block set and the Logix equivalents, with pins, behaviour, and gas plant usage.',
    long: 'Timers, counters, bistables, selection and clamping, scaling, filters, integrators, ramps, alarm supervision, add-on instructions with instance data, and communication blocks with their failure contract.'
  },
  {
    slug: 'pid', label: 'PID & loops', group: 'Control', icon: 'P', sort: 9,
    blurb: 'Loop vocabulary, tuning methods with their formulas, and the specific loops found in a gas plant.',
    long: 'Kc/Ti/Td and the inversions that trip people up, windup and bumpless transfer, cascade/split-range/ratio/override, published tuning tables labelled as starting points only, then fifteen real loops: what is controlled, with what, and what breaks.'
  },
  {
    slug: 'process', label: 'Gas process stages', group: 'Control', icon: 'GP', sort: 10,
    blurb: 'Inlet to sales: separation, compression, sweetening, dehydration, NGL recovery, fractionation, metering, relief, utilities.',
    long: 'Each stage as: purpose, the physical mechanism, the equipment, what the control system manipulates, the trip conditions, and the field truth that explains most upsets. Plus the automation architecture showing which layer owns which function.'
  },
  {
    slug: 'equipment', label: 'Equipment', group: 'Control', icon: 'EQ', sort: 11,
    blurb: 'Vessels, towers, cold boxes, machinery, pumps, actuators and utilities with their automation points and failure modes.',
    long: 'Read it as "what does this machine need from the control system, and how does it fail" - the two questions that determine the I/O list and the trip matrix.'
  },
  {
    slug: 'safety', label: 'Safety & interlocks', group: 'Control', icon: 'S', sort: 12,
    blurb: 'Independence, safe states, voting, bypass and proof testing, response time, alarm management, area classification.',
    long: 'Fourteen principles with the consequence spelled out, the shutdown-level structure (labelled as plant-specific on purpose), and the test types that decide whether a protection function is real.'
  },
  {
    slug: 'units', label: 'Units & formulas', group: 'Tools', icon: 'U', sort: 13,
    blurb: 'Gas measurement units, reference conditions, conversion factors, and the formulas that are true by definition.',
    long: 'Why reference conditions are part of the number, and the small set of calculations worth carrying: mA scaling, DP-to-flow, Kc from proportional band, liquid Cv, volume-to-energy, H2S grains-to-ppm - each with its derivation shown.'
  },
  {
    slug: 'standards', label: 'Standards index', group: 'Tools', icon: 'ST', sort: 14,
    blurb: 'Every standard this reference leans on, what it actually governs, and where it shows up here.',
    long: 'Plus the methodology page: how entries were sourced, why there are almost no numbers, and what UNVERIFIED means.'
  }
];
