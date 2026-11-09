/** The supplied revision 1.2 PDF is the source of truth. Pages are physical PDF pages. */
export const CONTROLS_NOTEBOOK = {
  title: 'Gas Plant Controls & Automation Reference Manual',
  revision: '1.2',
  revisionDate: 'October 27, 2026',
  pageCount: 108,
  pdfUrl: '/documents/controls-notebook-v1.2.pdf',
  indexUrl: '/documents/controls-notebook-v1.2.search.json',
  sha256: 'f9c1100d6d1d903aa16f96e7debc4659ff458ff0b12ba25e9649bf7de2755f65'
};

export const FRONT_MATTER = [
  { title: 'Cover & document control', page: 1 },
  { title: 'Original table of contents', page: 2 },
  { title: 'About this manual', page: 4 }
];

// Page numbers and names are transcribed from the original table of contents.
// A jump opens the original PDF, rather than presenting an extracted table as a
// verified operating procedure. The source retains all of its own cautions.
export const CONTROLS_CHAPTERS = [
  {
    id: 'working-rules', kind: 'section', number: '00', title: 'Working Rules', page: 7,
    description: 'Plant documents, authorization, work control and OT hygiene.',
    items: [
      ['0.1 Plant Documents Govern', 7], ['0.2 Authorization Boundaries', 7],
      ['0.3 Tag Naming Convention', 7], ['0.4 BPCS vs SIS Terminology', 8],
      ['0.5 Work Control Flow', 8], ['0.6 Forces, Inhibits, and Leftover Software Traps', 9],
      ['0.7 Backup, Download, and OT Hygiene', 9], ['0.8 Software Stack at Time of Writing', 9],
      ['0.9 Illustrative Calculations', 10]
    ]
  },
  {
    id: 'process', kind: 'section', number: '01', title: 'Gas Plant Process Flow Overview', page: 13,
    description: 'Process stages, streams, control loops and interlocks.',
    items: [
      ['1.1 Natural Gas Processing Plant Overview', 13], ['1.2 Key Process Streams Table', 13],
      ['1.3 Critical Control Loops at Each Stage', 14], ['1.4 Safety Interlock Overview', 14]
    ]
  },
  {
    id: 'instruments', kind: 'section', number: '02', title: 'Instrumentation Fundamentals', page: 17,
    description: '4–20 mA, HART, calibration, loop checks and instrument faults.',
    items: [
      ['2.1 The 4–20 mA Signal Standard', 17], ['2.2 Instrument Types', 17],
      ['2.3 HART Protocol Basics', 18], ['2.4 Instrument Calibration', 18],
      ['2.5 Loop Check Procedure', 18], ['2.6 Intrinsic Safety Basics', 19],
      ['2.7 Common Instrument Faults and Symptoms', 19]
    ]
  },
  {
    id: 'controllogix', kind: 'section', number: '03', title: 'Allen-Bradley ControlLogix 1756', page: 23,
    description: 'Hardware, software, naming and networking.',
    items: [
      ['3.1 Hardware Architecture', 23], ['3.2 Studio 5000 / RSLogix 5000 Basics', 24],
      ['3.3 Tag Naming Convention', 25], ['3.4 Networking', 26]
    ]
  },
  {
    id: 'flex-io', kind: 'section', number: '04', title: '1794 FLEX I/O', page: 29,
    description: 'Modules, example I/O map and configuration.',
    items: [
      ['4.1 Hardware Overview', 29], ['4.2 Common FLEX I/O Modules', 29],
      ['4.3 I/O Mapping Table — Gas Plant Example', 30], ['4.4 FLEX I/O Configuration in Studio 5000', 31]
    ]
  },
  {
    id: 'ladder', kind: 'section', number: '05', title: 'Ladder Logic Fundamentals', page: 35,
    description: 'Instruction references, annotated examples and ladder patterns.',
    items: [
      ['5.1 Core Instructions Reference', 35], ['5.2 Annotated Ladder Examples', 36],
      ['5.3 Advanced Ladder Patterns', 39], ['5.4 Standard Ladder Patterns', 41]
    ]
  },
  {
    id: 'hmi', kind: 'section', number: '06', title: 'AVEVA (Wonderware) InTouch HMI', page: 45,
    description: 'HMI tags, alarms, screen design and scripts.',
    items: [
      ['6.1 AVEVA (Wonderware) InTouch Overview', 45], ['6.2 HMI Tag List Template', 45],
      ['6.3 Alarm Management', 47], ['6.4 HMI Screen Design Guidelines', 48],
      ['6.5 InTouch Script Examples', 49]
    ]
  },
  {
    id: 'wiring', kind: 'section', number: '07', title: 'Wiring Placeholders and Field Drawings', page: 53,
    description: 'Wiring, drawing placeholders, grounding and shielding.',
    items: [
      ['7.1 Control Panel Wiring Standards', 53], ['7.2 Wiring Diagram Placeholders', 54],
      ['7.3 Grounding and Shielding Reference', 54]
    ]
  },
  {
    id: 'troubleshooting', kind: 'section', number: '08', title: 'Troubleshooting Guide', page: 57,
    description: 'Methods, diagnostic tables and checklists.',
    items: [
      ['8.1 Systematic Troubleshooting Methodology', 57], ['8.2 Troubleshooting Tables', 57],
      ['8.3 Quick Diagnostic Checklists', 59]
    ]
  },
  {
    id: 'safety', kind: 'section', number: '09', title: 'Safety and SIS Basics', page: 63,
    description: 'Process safety, SIL, SIF and gas plant safety topics.',
    items: [
      ['9.1 Process Safety Fundamentals', 63], ['9.2 Safety Integrity Level (SIL) Basics', 64],
      ['9.3 Safety Instrumented Function (SIF)', 64], ['9.4 Gas Plant Specific Safety Topics', 64]
    ]
  },
  {
    id: 'labs', kind: 'section', number: '10', title: 'Twelve Hands-On Labs', page: 69,
    description: 'Supervised exercises, from loop checks to first-out analysis.',
    items: [
      ['Lab 1: Instrument Loop Check', 69], ['Lab 2: FLEX I/O Module Replacement', 70],
      ['Lab 3: Motor Start/Stop Rung', 70], ['Lab 4: Configure and Tune a PID Loop', 71],
      ['Lab 5: Add and Configure a FLEX I/O Bank', 72], ['Lab 6: InTouch HMI Faceplate', 73],
      ['Lab 7: MSG Read — Inter-PLC Communication', 73],
      ['Lab 8: BPCS Trip String and Time-Limited Bypass (Not SIS / Not ESD SIF)', 74],
      ['Lab 9: Network Troubleshooting', 75], ['Lab 10: Alarm Rationalization Workshop', 76],
      ['Lab 11: Find and Clear Leftover Forces and Inhibits', 77],
      ['Lab 12: First-Out Narrative from Historian / SOE', 77]
    ]
  },
  {
    id: 'quick-reference', kind: 'section', number: '11', title: 'Quick Reference', page: 79,
    description: 'Desk reference tables, math and diagnostic reminders.',
    items: [
      ['Controller Status Indicators', 79], ['Common Ladder Instructions', 79],
      ['4–20 mA Quick Math', 80], ['Calibration 5-Point Expected mA Values', 80],
      ['PID Tuning Rules of Thumb', 80], ['I/O Connection Fault Codes', 80],
      ['HMI Alarm Priority Presentation', 80], ['H₂S Exposure Limits and Actions', 81],
      ['EtherNet/IP Troubleshooting', 81], ['Studio 5000 Common Commands', 81],
      ['Key ISA Tag Function Codes', 82]
    ]
  },
  { id: 'glossary', kind: 'appendix', number: 'A', title: 'Glossary of Terms', page: 85, description: 'Abbreviations and definitions.', items: [] },
  { id: 'formulas', kind: 'appendix', number: 'B', title: 'Useful Formulas', page: 87, description: 'Scaling, conversions and reference formulas.', items: [] },
  { id: 'revisions', kind: 'appendix', number: 'C', title: 'Revision Log', page: 89, description: 'The manual’s change history.', items: [] },
  { id: 'placeholders', kind: 'appendix', number: 'D', title: 'Company-Specific Placeholders Checklist', page: 90, description: 'Site information to supply and approve.', items: [] },
  {
    id: 'field-card', kind: 'appendix', number: 'E', title: 'Field Pocket Card', page: 93,
    description: 'A compact field reference; confirm site-specific numbers.',
    items: [
      ['4–20 mA math', 93], ['Work-control reminder', 93], ['BPCS vs SIS', 93],
      ['Fail-safe discrete (plant convention)', 93], ['H₂S / LEL (confirm plant numbers)', 93],
      ['End-of-job software checks', 93], ['Who to call (fill in)', 93]
    ]
  },
  {
    id: 'training', kind: 'appendix', number: 'F', title: 'Training Program Materials', page: 95,
    description: 'Review cards, lab questions, schedule and competency sign-off.',
    items: [
      ['F.1 Review Cards', 95], ['F.2 Lab Review Questions and Answers', 99],
      ['F.3 Eight-Week Program Schedule', 103], ['F.4 Competency Matrix (Supervisor Sign-Off)', 105],
      ['F.5 Assessment Notes', 106]
    ]
  },
  { id: 'additional-instructions', kind: 'appendix', number: 'G', title: 'Additional Instructions (Not Used in Interlocks)', page: 107, description: 'Additional instruction references.', items: [] },
  {
    id: 'references', kind: 'appendix', number: 'H', title: 'References', page: 108,
    description: 'Vendor literature, regulatory sources and industry standards.',
    items: [
      ['Rockwell Automation Literature', 108], ['Regulatory and Health Sources', 108],
      ['Industry Standards', 108], ['Secondary Sources', 108]
    ]
  }
];

/** Related reading, not a claim that the PDF is the source of an existing reference entry. */
export const RELATED_CONTROLS_READING = {
  acronyms: { page: 85, label: 'Glossary of terms' },
  valves: { page: 17, label: 'Instrumentation fundamentals' },
  instruments: { page: 17, label: 'Instrumentation fundamentals' },
  'isa-letters': { page: 82, label: 'Key ISA tag function codes' },
  datatypes: { page: 25, label: 'ControlLogix data types' },
  instructions: { page: 35, label: 'Ladder instruction reference' },
  rungs: { page: 36, label: 'Annotated ladder examples' },
  'function-blocks': { page: 39, label: 'Advanced ladder patterns' },
  pid: { page: 71, label: 'PID lab' },
  process: { page: 13, label: 'Gas plant process flow' },
  equipment: { page: 13, label: 'Gas plant process flow' },
  safety: { page: 63, label: 'Safety and SIS basics' },
  units: { page: 87, label: 'Useful formulas' },
  standards: { page: 108, label: 'Notebook references' }
};
