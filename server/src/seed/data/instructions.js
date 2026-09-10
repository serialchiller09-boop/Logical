/**
 * LADDER COMPONENTS (instructions).
 *
 * Mnemonics, definitions and members taken from Rockwell instruction-set references
 * (1785-RM001 PLC-5, 1747-RM001 SLC 500, Logix 5000 instruction set) and the
 * IEC 61131-3 language definitions. Where a member name can differ by firmware
 * revision, the entry says so instead of asserting one spelling.
 */

/** ---------------------------------------------------------------- conceptual frame */
export const LADDER_BASICS = [
  {
    id: 'lb-rails', title: 'Power rails and power flow',
    body: 'The two vertical lines are the left (power) and right (return) rails. Nothing in a ladder diagram carries electrical current: "power flow" is a visual metaphor for boolean evaluation, left to right, rung by rung, top to bottom.',
    why: 'Understanding that power flow is evaluation-order - not energy - is what makes parallel branches, negation, and "why didn\'t my output turn off" immediately obvious.',
    status: 'standard'
  },
  {
    id: 'lb-scan', title: 'The scan cycle',
    body: 'Read inputs -> execute the program top-to-bottom, left-to-right -> write outputs -> housekeeping/communications -> repeat. Every value you see on an HMI is a snapshot from some point in a past scan.',
    why: 'Sets the floor on response time. A protection function that must act in 20 ms cannot live in a 100 ms scan task; it belongs in the SIS or a dedicated fast task. Also explains why a signal shorter than the scan time can be missed entirely unless you use a latched or high-speed input.',
    status: 'standard'
  },
  {
    id: 'lb-order', title: 'Order matters (duplicate writes)',
    body: 'If two rungs both write the same output with OTE, the LAST one evaluated wins. If the same bit is used as both a coil and a latched set/reset pair in different files, the execution order in the task defines the outcome.',
    why: 'This is the single most common "logic mystery" in plant programs. Rule: one writer per output, and use OTL/OTU pairs deliberately rather than accidentally.',
    status: 'standard'
  },
  {
    id: 'lb-branch', title: 'Series = AND, parallel = OR',
    body: 'Contacts in series must all conduct: logical AND. Branches in parallel need only one path: logical OR. A rung is therefore an arbitrary boolean expression, and any expression can be drawn as a rung.',
    why: 'Being able to read a rung as an equation - and write an equation as a rung - is the whole skill. De Morgan then lets you simplify: NOT(A AND B) = NOT A OR NOT B.',
    status: 'standard'
  },
  {
    id: 'lb-xio-polarity', title: 'XIO is not a field NC contact',
    body: 'XIO means "the bit is 0". It says nothing about how the device is wired. A normally-closed pressure switch that is HEALTHY reads 1, so you examine it with XIC; a start button wired normally-open reads 0 at rest, so an XIO on it means "not pressed". Two orthogonal decisions: the field wiring contact type, and the instruction that reads the resulting bit.',
    why: 'Conflating them is how safety functions end up inverted. Write the truth table for each device before you draw the rung.',
    status: 'standard'
  },
  {
    id: 'lb-neglogic', title: 'De-energize to trip',
    body: 'Protective outputs are normally energized in health and de-energized to cause the trip, so that a broken wire, a lost card, or a power failure produces a safe state rather than a false "all good". The logic then reads as a chain of XIO-style "no fault present" conditions in series with a permissive, driving an energized-hold output.',
    why: 'The reason a plant trips for no apparent reason at 3 a.m. is often this design working exactly as intended.',
    status: 'practice'
  },
  {
    id: 'lb-sealin', title: 'Seal-in (latch) circuit',
    body: 'Start button in parallel with the output\'s own holding contact, all in series with the stop condition. Release the button, the output keeps itself energized; the stop (or any series trip) breaks the path and it drops out.',
    why: 'The most-used circuit pattern in industry, and the template for every motor, pump, and compressor start in your plant.',
    status: 'standard'
  },
  {
    id: 'lb-master', title: 'Master control / conditional zones',
    body: 'A zone construct (MCR / MCS-RCS in IEC, or an enable bit ANDed into a group of rungs) makes every non-retentive output in the zone go false when the condition is false. Latched bits keep their state - a subtlety that has surprised people for forty years.',
    status: 'practice'
  }
];

/** ---------------------------------------------------------------- instruction catalogue */
export const INSTRUCTIONS = [
  // ---- contacts
  {
    id: 'in-xic', mnemonic: 'XIC', name: 'Examine If Closed', category: 'Contact',
    symbol: '---] ]---', ascii: '-] [-',
    iec: 'NO contact |---|', siemens: '—| |— (normally open contact)',
    function: 'Evaluates TRUE when the addressed bit is 1 (on). Example devices: an input that energizes when the process is in the "detected" state, an internal bit, a timer done bit.',
    members: [
      { name: '[address]', desc: 'bit or word: a whole word/integer is true when non-zero' }
    ],
    usage: 'Start button (NO), permissive "lube pressure OK", timer .DN, "Auto mode" bit, "valve proven open" ZSO.',
    gotcha: 'On a word operand, XIC is a non-zero test, not a bit test. XIC N7:0 is true for any value other than 0.',
    sources: [{ label: 'Rockwell 1747-RM001C SLC Instruction Set Reference' }, { label: 'Rockwell 1785-RM001 PLC-5 Instruction Set Reference' }],
    status: 'standard'
  },
  {
    id: 'in-xio', mnemonic: 'XIO', name: 'Examine If Open', category: 'Contact',
    symbol: '---] /---', ascii: '-]/[-',
    iec: 'NC contact |---|/|', siemens: '—|/|— (normally closed contact)',
    function: 'Evaluates TRUE when the addressed bit is 0 (off).',
    usage: 'Stop/E-stop "not pressed", "no fault present", "not in local", "override inactive", normally-closed switch when healthy it reads 1.',
    gotcha: 'It is a negation of the bit, not a statement about the field device. See Ladder Basics: "XIO is not a field NC contact".',
    sources: [{ label: 'Rockwell 1747-RM001C' }],
    status: 'standard'
  },
  {
    id: 'in-xis', mnemonic: 'XIS / XOS', name: 'Examine If Signed / Examine If Signed (legacy)', category: 'Contact',
    symbol: '---]S]---', ascii: '-]S[-',
    iec: 'n/a', siemens: 'n/a',
    function: 'Legacy PLC-5/SLC contacts testing the sign bit of a word: XIS true when the value is negative, XOS true when non-negative (zero or positive).',
    usage: 'You will meet these on old plants reading a signed analog value. In Logix the same idea is a comparison (LSS/LGS) or just a math error bit.',
    gotcha: 'Rarely seen in new work; know it so you can read legacy rungs without guessing.',
    status: 'vendor'
  },
  {
    id: 'in-ons', mnemonic: 'ONS', name: 'One Shot', category: 'Edge',
    symbol: '---]S]--- (one-shot bit)', ascii: '-]|ONS|-',
    iec: 'R_TRIG (rising) / F_TRIG (falling)', siemens: '—|P|— rising edge, —|N|— falling edge',
    function: 'Conducts for exactly one scan on a false-to-true transition of the preceding conditions, using an internal one-shot memory bit. Subsequent scans are blocked until the rung goes false again.',
    members: [{ name: '(internal bit)', desc: 'the instruction needs one storage bit per instance - never reuse one ONS bit in two rungs' }],
    usage: 'Incrementing a counter once per part, capturing a snapshot value at the moment a mode changes, stepping a sequence, writing a setpoint exactly once when a button is pressed.',
    gotcha: 'Without ONS, "one per event" logic double-counts whenever the input bounces or stays high across scans. With a mis-shared internal bit, it counts for neither.',
    sources: [{ label: 'Rockwell Logix 5000 / PLC-5 one-shot instructions' }],
    status: 'standard'
  },
  {
    id: 'in-osr', mnemonic: 'OSR / OSF', name: 'One Shot Rising / One Shot Falling', category: 'Edge',
    symbol: '-[OSR]-', ascii: '-[OSR]-',
    iec: 'R_TRIG / F_TRIG', siemens: '—|P|— / —|N|—',
    function: 'Edge detection packaged as an instruction with its own storage operand: sets its output bit for one scan on the transition.',
    usage: 'Where the platform prefers an explicit instance over an implicit bit (older SLC/PLC-5 style and some Logix dialects).',
    gotcha: 'OSR/OSF vs ONS is a platform convention, not a logic difference. Do not mix them in the same rung and expect to be able to read it back at 2 a.m.',
    status: 'vendor'
  },

  // ---- coils / outputs
  {
    id: 'in-ote', mnemonic: 'OTE', name: 'Output Energize', category: 'Coil',
    symbol: '---( )---', ascii: '-( )-',
    iec: 'coil |-( )| / assignment :=', siemens: '—( )—',
    function: 'Writes the rung result to the address: 1 when the rung is true, 0 when it is false. Non-retentive - the bit follows the rung every scan.',
    usage: 'The default output: motor starters, valves, indicator lamps, interlock-permissive bits.',
    gotcha: 'Two OTEs on the same address is a defect: last-executed wins and the first becomes invisible. Many controllers will also warn you; do not ignore it.',
    sources: [{ label: 'Rockwell 1747-RM001C / 1785-RM001' }],
    status: 'standard'
  },
  {
    id: 'in-otl', mnemonic: 'OTL', name: 'Output Latch', category: 'Coil',
    symbol: '---(L)---', ascii: '-(L)-',
    iec: 'S coil |-(S)|', siemens: '—(S)—',
    function: 'Sets the bit to 1 when the rung is true and leaves it there when the rung goes false. It stays until an OTU clears it - and, on most platforms, survives a power cycle if the memory type is retentive.',
    usage: 'Alarm memory ("what tripped us"), trip-reason capture, first-out logic, mode requests that must survive the button release.',
    gotcha: 'Every OTL needs a defined, reachable clearing path. A latch with no unlatch is how a plant stays tripped after the cause is gone - so always write the OTU rung in the same file, with an operator-clearable route.',
    status: 'standard'
  },
  {
    id: 'in-otu', mnemonic: 'OTU', name: 'Output Unlatch', category: 'Coil',
    symbol: '---(U)---', ascii: '-(U)-',
    iec: 'R coil |-(R)|', siemens: '—(R)—',
    function: 'Resets the bit to 0 when its rung is true; leaves it alone otherwise.',
    usage: 'Acknowledge button, reset after maintenance, sequence advance.',
    gotcha: 'If set and reset are simultaneously true, the outcome depends on execution order (and on the platform for S/R pairs). Design so they cannot both be true, or pick the construct that documents the priority.',
    status: 'standard'
  },
  {
    id: 'in-ien', mnemonic: 'IOT / IIN / IDI', name: 'Immediate output / immediate input (legacy)', category: 'Coil',
    symbol: '-[IOT]-', ascii: '-[IOT]-',
    iec: 'immediate access / direct I/O reference', siemens: 'direct access (process image vs. direct addressing)',
    function: 'Bypasses the image table: update the physical output now, or re-read the physical input now.',
    usage: 'Rare, and for good reason. Legitimate uses are narrow (fast response on a single point); almost everything better done as a faster task or dedicated hardware.',
    gotcha: 'Using immediate access inconsistently makes the same input read differently in two rungs in the same scan. If you find yourself reaching for it, question the architecture.',
    sources: [{ label: 'Rockwell 1785-RM001 (IIN, IOT, IDI)' }],
    status: 'vendor'
  },

  // ---- timers
  {
    id: 'in-ton', mnemonic: 'TON', name: 'Timer On-Delay', category: 'Timer',
    symbol: '-[TON]-', ascii: '-[TON .PRE .ACC .DN EN TT]-',
    iec: 'TON (IN, PT, Q, ET)', siemens: 'TON / TP family (IEC timers)',
    function: 'Accumulates time while the rung is true. .DN (Q) goes true when .ACC (ET) reaches .PRE (PT). .ACC resets to zero when the rung goes false (non-retentive).',
    members: [
      { name: '.PRE / PT', desc: 'preset duration (Logix timers: milliseconds in .PRE, or T# literals)' },
      { name: '.ACC / ET', desc: 'accumulated elapsed time' },
      { name: '.EN / .TT / .DN', desc: 'enable / timer-timing / done. IEC exposes IN, Q, ET.' }
    ],
    usage: 'Restart lockout after trip (a real compressor requirement), delayed auto-initiate after a permissive clears, proven-open delay before you declare a valve failed, run-up delay before loading a machine, pump-off delay on low level to ride through a dip.',
    gotcha: 'Confirm the time base of the preset. "5" in a Logix .PRE is 5 ms. And a TON used as an "off delay" will silently reset its accumulator the moment the rung drops - that is what TOF is for.',
    status: 'standard'
  },
  {
    id: 'in-tof', mnemonic: 'TOF', name: 'Timer Off-Delay', category: 'Timer',
    symbol: '-[TOF]-', ascii: '-[TOF]-',
    iec: 'TOF', siemens: 'TOF',
    function: 'Output (done) is true while the rung is true, and stays true for the preset after the rung goes false, timing out and then dropping.',
    usage: 'Cool-down fan run-on after a heater stops, purge blower after flame loss, keeping a lube pump running after machine stop, alarm hold-off so a transient does not clear an annunciation instantly.',
    gotcha: 'Some legacy platforms warn against resetting a TOF with RES because the semantics are confusing. Read done as "output still commanded", not "time elapsed".',
    status: 'standard'
  },
  {
    id: 'in-rto', mnemonic: 'RTO', name: 'Retentive Timer On', category: 'Timer',
    symbol: '-[RTO]-', ascii: '-[RTO]-',
    iec: 'TONR', siemens: 'TONR',
    function: 'Accumulates while the rung is true and HOLDS .ACC when it goes false. Resumes on the next true. Only an explicit reset (RES) clears it, and the accumulated value typically survives a power cycle.',
    usage: 'Run-hours for maintenance scheduling, accumulated "flowed-through" time, freeze-protection duration, heat-tracing runtime.',
    gotcha: 'Forget the RES and it counts forever - which is exactly what you want for run-hours and exactly what you do not want for a delay. Every RTO needs a documented reset condition.',
    status: 'standard'
  },
  {
    id: 'in-tp', mnemonic: 'TP', name: 'Time Pulse', category: 'Timer',
    symbol: '-[TP]-', ascii: '-[TP]-',
    iec: 'TP', siemens: 'TP',
    function: 'On a rising edge at IN, forces Q true for exactly PT regardless of what IN does afterwards (non-retriggerable).',
    usage: 'Fixed-duration injection stroke, timed purge pulse, a guaranteed minimum run or minimum off period that an operator cannot shorten.',
    gotcha: 'If IN bounces during the pulse, nothing restarts - that is the point, but it surprises people coming from TON.',
    status: 'standard'
  },
  {
    id: 'in-res', mnemonic: 'RES', name: 'Reset', category: 'Timer / Counter',
    symbol: '-[RES]-', ascii: '-[RES]-',
    iec: 'R input on the timer/counter', siemens: 'reset input',
    function: 'Clears a timer or counter: .ACC to 0 and status bits cleared.',
    usage: 'End of batch, shift change, after an acknowledged trip, at the start of a new initiate sequence.',
    gotcha: 'Order matters: a RES executed after the timer in the same scan (or in a later file) resets the accumulation you just made. Put resets before the timed element, or in a clearly-later rung, and label why.',
    status: 'standard'
  },

  // ---- counters
  {
    id: 'in-ctu', mnemonic: 'CTU', name: 'Count Up', category: 'Counter',
    symbol: '-[CTU]-', ascii: '-[CTU .CU .ACC .PRE .DN .OV]',
    iec: 'CTU (CU, R, PV, Q, CV)', siemens: 'CTU',
    function: 'Increments .ACC on each false-to-true transition of its rung; .DN true when .ACC >= .PRE.',
    members: [
      { name: '.ACC / CV', desc: 'accumulated count (retentive on many platforms)' },
      { name: '.PRE / PV', desc: 'preset' },
      { name: '.DN / Q', desc: 'done' },
      { name: '.CU / .CD / .OV / .UN', desc: 'count-up / count-down / overflow / underflow status bits (Logix and legacy)' }
    ],
    usage: 'Chemical injection pump strokes vs. target, filter-backwash cycle count, starts-per-day on a reciprocator, batch stages, cycles-for-maintenance.',
    gotcha: 'The count happens on the EDGE, so a bouncing contact double-counts: put an ONS in front of it. And a counter whose reset never fires just saturates and stops being a process variable.',
    status: 'standard'
  },
  {
    id: 'in-ctd', mnemonic: 'CTD / CTUD', name: 'Count Down / Up-Down', category: 'Counter',
    symbol: '-[CTD]-', ascii: '-[CTD .CD .ACC .DN]',
    iec: 'CTD (CD, LD, PV, Q, CV) / CTUD', siemens: 'CTD / CTUD',
    function: 'CTD decrements per false-to-true transition and is done when .ACC <= 0. CTUD is one block with separate count-up and count-down inputs into a single accumulator.',
    usage: 'Remaining-strokes-to-go, parts remaining in a batch, inventory in/out on one accumulator.',
    gotcha: 'Sharing one address between a CTU and a CTD (legacy idiom) works, but it is unreadable to the next person. Prefer CTUD where the platform has it.',
    status: 'standard'
  },

  // ---- compares
  {
    id: 'in-equ', mnemonic: 'EQU / NEQ', name: 'Equal / Not Equal', category: 'Compare',
    symbol: '-[EQU A=B]-', ascii: '-[EQU]-',
    iec: 'EQ / NE', siemens: '== / <>',
    function: 'Compares Source A with Source B numerically (integer or float), true when equal / not equal.',
    usage: 'Mode/state matching ("State == RUNNING"), stepping a sequence ("Step == 12"), recipe selection.',
    gotcha: 'On REAL operands, exact equality is unreliable - use a deadband or an integer state value.',
    status: 'standard'
  },
  {
    id: 'in-grt', mnemonic: 'GRT / LES', name: 'Greater Than / Less Than', category: 'Compare',
    symbol: '-[GRT A>B]-', ascii: '-[GRT]- / -[LES]-',
    iec: 'GT / LT', siemens: '> / <',
    function: 'True when A > B / A < B.',
    usage: 'Alarm limits (LT for "level below low", GRT for "pressure above high"), permissives, anti-surge approach detection, dew point limits.',
    gotcha: 'Hysteresis is not built in. A bare GRT on a noisy PV chatters an alarm; use a two-sided window (GRT on the high limit, LES on a lower reset limit) or an alarm block with deadband.',
    status: 'standard'
  },
  {
    id: 'in-geq', mnemonic: 'GEQ / LEQ', name: 'Greater-or-Equal / Less-or-Equal', category: 'Compare',
    symbol: '-[GEQ A>=B]-', ascii: '-[GEQ]- / -[LEQ]-',
    iec: 'GE / LE', siemens: '>= / <=',
    function: 'True when A >= B / A <= B. The inclusive boundary matters when a setpoint can sit exactly on a limit.',
    usage: 'Startup permissives ("suction pressure >= minimum"), shutdown thresholds expressed as limits, "at least N stages running".',
    gotcha: 'Signedness: comparing a UINT with a negative value, or mixing signed and unsigned at a protocol boundary, gives a surprising TRUE. Check both operand types.',
    status: 'standard'
  },

  // ---- math / data
  {
    id: 'in-mov', mnemonic: 'MOV', name: 'Move', category: 'Data',
    symbol: '-[MOV Src>Dst]-', ascii: '-[MOV]-',
    iec: 'MOVE (IN, EN,ENO)', siemens: 'MOVE',
    function: 'Copies Source to Destination on every scan the rung is true. On Logix, MOV is word-by-word for structured data; COP copies arrays/blocks.',
    usage: 'Loading presets, initializing setpoints from a recipe, snapshotting a value at trip time, writing a constant to an output-tracking buffer.',
    gotcha: 'MOV executes while the rung is true - so a "snapshot at trip" needs an ONS in front of it, or it just tracks live forever. And MOV across differing data types silently truncates.',
    status: 'standard'
  },
  {
    id: 'in-add', mnemonic: 'ADD / SUB / MUL / DIV', name: 'Integer arithmetic', category: 'Math',
    symbol: '-[ADD A+B>Dst]-', ascii: '-[ADD]-',
    iec: 'ADD / SUB / MUL / DIV', siemens: 'ADD / SUB / MUL / DIV',
    function: 'Arithmetic with a destination operand and a math-error/overflow status bit. Integer forms truncate.',
    usage: 'Dew point offsets, unit conversion, simple flow split, bias/offset trim on a scaled value.',
    gotcha: 'Overflow sets a status bit and may wrap - the platform does not generally stop your program to tell you. Check .OV/.EQ or equivalent after anything that can grow.',
    status: 'standard'
  },
  {
    id: 'in-cpt', mnemonic: 'CPT', name: 'Compute (expression)', category: 'Math',
    symbol: '-[CPT (expr)>Dst]-', ascii: '-[CPT]-',
    iec: 'expression in Structured Text', siemens: 'Calc / ST expression',
    function: 'Evaluates a full parenthesized expression into a destination. Rockwell-specific convenience: one rung instead of five.',
    usage: 'Density compensation, sqrt extraction, energy conversion, dew-point equations, chemical injection rate = f(flow).',
    gotcha: 'A CPT is a wall of unreadable text on a printed rung and it hides intermediate errors. Any expression worth more than one line is worth a CPT with an error bit, or a documented AOI.',
    status: 'vendor'
  },
  {
    id: 'in-scl', mnemonic: 'SCL / NORM_X + SCALE_X', name: 'Scale', category: 'Analog',
    symbol: '-[SCL]-', ascii: '-[SCL]-',
    iec: 'NORM_X then SCALE_X (IEC 61131-3 scaling blocks)', siemens: 'NORM_X / SCALE_X',
    function: 'Linear mapping from an input range to an output range: the raw-to-engineering-unit conversion, and the engineering-to-raw conversion for outputs.',
    formula: 'EU = EU_lo + ((raw - raw_lo) * (EU_hi - EU_lo)) / (raw_hi - raw_lo)',
    usage: 'AI raw counts to engineering units (or, on modern platforms, the card does it and you configure EU scaling instead), AO scaling to a 4-20 mA output block, span/zero math.',
    gotcha: 'Do the square-root extraction for a DP flow meter exactly once, in one named place. Double extraction reads fine until the flow moves, then lies beautifully.',
    status: 'standard'
  },
  {
    id: 'in-lim', mnemonic: 'LIM', name: 'Limit (clamp)', category: 'Data',
    symbol: '-[LIM lo>in>hi]-', ascii: '-[LIM]-',
    iec: 'LIMIT / MED', siemens: 'LIMIT / MED3',
    function: 'Clamps a value between a low and a high limit.',
    usage: 'PID output clamping to a valve travel range, protecting a setpoint from operator over-entry, split-range allocation, override selection.',
    gotcha: 'A soft clamp is not a safety function. It does not protect against a program fault or an out-of-range write, and it disappears the moment somebody edits the limit.',
    status: 'standard'
  },
  {
    id: 'in-sel', mnemonic: 'SEL / MUX', name: 'Select / Multiplexer', category: 'Data',
    symbol: '-[SEL G>A:B]-', ascii: '-[SEL]- / -[MUX]-',
    iec: 'SEL / MUX', siemens: 'SEL / multiplexer FB',
    function: 'SEL picks one of two sources based on a boolean gate. MUX picks one of N sources based on an index.',
    usage: 'High/high-high transmitter selection, "use online analyzer, else lab value", remote-vs-local setpoint source, cascade vs. manual setpoint selection, unit-to-unit lead/lag selection.',
    gotcha: 'Selection has no bumpless transfer built in: if the selected source jumps, your downstream PID sees a step. Add tracking or slew limiting at the selection point when a human or an asset cares.',
    status: 'standard'
  },
  {
    id: 'in-gsv', mnemonic: 'GSV / GSF', name: 'Get/Set Status Word Value / Flag', category: 'Data',
    symbol: '-[GSV]-', ascii: '-[GSV]-',
    iec: 'vendor-specific', siemens: 'n/a',
    function: 'Writes into controller status-word elements that are otherwise read-only by ordinary tag reference. GSV sets a value; GSF sets a flag bit.',
    usage: 'Legacy and integration code manipulating controller status words - e.g. communication or operating-mode items not exposed as normal tags.',
    gotcha: 'Exact spelling, availability, and which status words may be written vary by platform and generation. Check the mnemonic and the writable range of the target word in the instruction set manual for the controller in front of you before porting any rung that uses them.',
    sources: [{ label: 'Rockwell Logix 5000 instruction set' }],
    status: 'vendor'
  },
  {
    id: 'in-cps', mnemonic: 'CPS', name: 'Compute with Single Precision', category: 'Math',
    symbol: '-[CPS]-', ascii: '-[CPS]-',
    iec: 'n/a (legacy)', siemens: 'n/a',
    function: 'PLC-5-era floating point compute. Same role as CPT in single precision.',
    usage: 'Legacy program reading only - and a useful reminder that type handling differs more across generations than across vendors.',
    status: 'vendor'
  },

  // ---- program control
  {
    id: 'in-jsr', mnemonic: 'JSR / SBR / RET', name: 'Jump to Subroutine', category: 'Program control',
    symbol: '-[JSRROUT, n, p1..]-', ascii: '-[JSR]-',
    iec: 'CAL / FB call / POU call', siemens: 'call FB / FC',
    function: 'Calls a routine with up to N pass-through parameters; RET returns to the rung after the JSR (many platforms return implicitly at the end of the routine).',
    usage: 'The standard structure for a gas plant: one sub-routine or add-on instruction per machine type, called once per instance, with parameters (or an instance UDT) for its tags.',
    gotcha: 'Subroutine execution is still sequential scan time. Ten instances of a 3 ms sub is 30 ms added to the scan. Watch total scan time when you "modularize everything".',
    status: 'standard'
  },
  {
    id: 'in-jmp', mnemonic: 'JMP / LBL', name: 'Jump / Label', category: 'Program control',
    symbol: '-[JMP LBL n]-', ascii: '-[JMP]-',
    iec: 'AVOID - use selection or a structured construct instead', siemens: 'GOTO (discouraged)',
    function: 'Skips execution from the JMP to the matching LBL when the rung is true.',
    usage: 'Legitimate: skipping a whole optional section that is not in service. Otherwise: a maintenance hazard.',
    gotcha: 'Outputs inside a skipped zone keep their last value - they are not reset. That is how "we jumped over the shutdown logic and nothing tripped" happens. Prefer JSR or an enable condition; if you must use JMP, put the reason in the rung comment.',
    status: 'practice'
  },
  {
    id: 'in-mcr', mnemonic: 'MCR / MCS-RCS', name: 'Master Control Reset', category: 'Program control',
    symbol: '-[MCR-]', ascii: '-[MCR START]- / -[MCR END]-',
    iec: 'MCS / RCS (master control switch / reset)', siemens: 'MCS/RCS or an enable bit ANDed per rung',
    function: 'Marks the start and end of a zone. While the enabling rung is false, all non-retentive outputs in the zone are forced false; latched/retentive state is preserved.',
    usage: 'Group enable ("process unit in service"), commissioning isolation of a section.',
    gotcha: 'Because latched bits survive an MCR zone going false, using MCR to "make a section safe" is wrong - it does not do what it looks like it does. Isolation belongs in the safety system.',
    status: 'practice'
  },
  {
    id: 'in-end', mnemonic: 'END / ENDF / ENDE / STOP / FAL / FSC', name: 'Program control and fault', category: 'Program control',
    symbol: '-[END]-', ascii: '-[END]- / -[FAL n]-',
    iec: 'n/a', siemens: 'n/a (OB-level control)',
    function: 'END terminates a file/scan early; ENDF/ENDE bracket fault-handling sections; FAL/FSC define faults that can stop the processor or a task; STOP halts execution.',
    usage: 'Guard rails on critical programs: a FAL that faults the task if a comm message returns bad data, or a checksum on a parameter table.',
    gotcha: 'A mis-set FAL/FSC can stop a plant for a trivial data error. In continuous process service the fault severity for each non-critical section is a deliberate decision, usually "warn, do not stop".',
    status: 'vendor'
  },
  {
    id: 'in-msg', mnemonic: 'MSG / FROM-TO', name: 'Message (explicit messaging)', category: 'Communication',
    symbol: '-[MSG CIP Read...]-', ascii: '-[MSG]- / -[FROM]- / -[TO]-',
    iec: 'vendor/library FB (e.g. Modbus FBs)', siemens: 'GET/PUT, MB_CLIENT, etc.',
    function: 'Reads/writes data to another node: a flow computer, an analyzer, a drive, an RTU, another controller. Legacy platforms used FROM/TO to a specific module; Logix uses CIP messages.',
    usage: 'In gas plants: pulling composition/GHV from the flow computer, sending allocations, reading a BTU analyzer, writing a setpoint to an MCC.',
    gotcha: 'A message has four failure modes people forget: it never starts, it never finishes, it finishes with stale data, it finishes with good data from the wrong node. Always wire .EN/.DN/.ER, a timeout, and a data-age quality bit into the logic that consumes it.',
    status: 'standard'
  },
  {
    id: 'in-ai', mnemonic: 'AOI', name: 'Add-On Instruction (structured program unit)', category: 'Program control',
    symbol: '-[AOI Inst]-', ascii: '-[PumpCtr(Inst)]-',
    iec: 'function block (FB) with an instance', siemens: 'FB instance in a DB',
    function: 'A packaged, typed, reusable block of logic with input, output, static, and local members plus its own execution support. The Logic equivalent of a function block with instance data.',
    usage: 'How a well-built plant program is structured: one AOI per machine/loop type, with a matching faceplate template, so all 9 separators and 6 compressors share behavior, documentation, and alarm handling.',
    gotcha: 'Instance data is per-call. A stateful block called twice with the same instance is one machine with two personalities - which is why "copy-paste the instance tag" needs discipline.',
    status: 'vendor'
  },

  // ---- control
  {
    id: 'in-pid', mnemonic: 'PID', name: 'PID loop instruction / control block', category: 'Control',
    symbol: '-[PID]-', ascii: '-[PID PV SP CV Kc Ti Td Mode]-',
    iec: 'PID / PID_LOOPS function block', siemens: 'PID_Compact / CONT_C (SFC: PID)',
    function: 'Computes a controller output from setpoint and process variable with proportional, integral, and derivative action; handles manual/auto, output and integral limits, tracking, and cascade.',
    members: [
      { name: '.PV / .SP / .CV', desc: 'process variable, setpoint, controller output (0-100%)' },
      { name: '.Kc', desc: 'proportional gain (dimensionless; some controllers use proportional band instead)' },
      { name: '.Ti / .Td', desc: 'integral and derivative TIME (or reset RATE, depending on the setting) - units are the classic gotcha' },
      { name: '.Mode', desc: 'Logix convention: 0 = Manual, 1 = Auto, 2 = Cascade' },
      { name: '.MAXI/.MINI', desc: 'integral limits (anti-windup clamp)' },
      { name: '.MAXQ/.MINQ', desc: 'output (control variable) limits' },
      { name: '.DBNDBND', desc: 'control deviation band - alarm if PV stays away from SP too long' },
      { name: '.INDEP', desc: 'selects whether Ti/Td are interpreted in minutes or seconds' },
      { name: '.CTL1/.CTL2', desc: 'control switches (e.g. ramp/velocity limiting); the exact set is firmware-specific' }
    ],
    note: 'Member spellings and the meaning of some switches DO differ between controller families and firmware revisions. Confirm against the instruction set manual for the exact controller - this app will not guess on your behalf.',
    usage: 'Everything regulatory in the plant: separator pressure letdown, level dump, glycol circulation, TEG temperature, fuel gas header pressure, dew point trim, compressor anti-surge (usually a dedicated block), discharge temperature.',
    gotcha: 'A PID written in the BPCS is not a safety layer. High level protection is a switch to a trip, not the controller driving harder. And bumpless transfer requires the tracking to be right on the manual-to-auto transition or you will step the valve.',
    status: 'standard'
  },
  {
    id: 'in-tun', mnemonic: 'TUN', name: 'Tune (auto-tune support)', category: 'Control',
    symbol: '-[TUN]-', ascii: '-[TUN]-',
    iec: 'n/a (some platforms offer tuning FBs)', siemens: 'PID_Compact tuning/optimization functions',
    function: 'Presents the PID block to a tuning interface and lets the controller run tuning tests on the loop.',
    usage: 'Commissioning and re-tuning after a plant change.',
    gotcha: 'Auto-tune on a live process is a test injection. It belongs in commissioning or a deliberate outage window, and it needs the rest of the plant stable - auto-tuning a level loop while the downstream unit is swinging gives you garbage with confidence.',
    status: 'vendor'
  },
  {
    id: 'in-alarm', mnemonic: 'ALM / analog alarm blocks', name: 'Analog alarm (HI/HIHI/LO/LOLO, ROC)', category: 'Alarm',
    symbol: '-[ALM]-', ascii: '-[ALM]- / -[ANA alarms]-',
    iec: 'ALARM (limit alarm FB), HYSTERES + compare, or vendor alarm FB', siemens: 'limit supervision / ALARM blocks',
    function: 'Compares a value against limits with deadband and on/off delay, producing alarm and trip bits. This is what you should use instead of a bare GRT/LES.',
    members: [
      { name: 'PV', desc: 'value monitored' },
      { name: 'High limit + deadband', desc: 'reset must fall below (limit - deadband) before the alarm clears' },
      { name: 'On-delay / off-delay', desc: 'filter for transients and for instrument noise; on a trip, the delay is a deliberate, documented risk decision' },
      { name: 'Severity / priority', desc: 'map to ISA-18.2 priority concepts (emergency/high/medium/low), not to whichever colors the HMI ships with' }
    ],
    usage: 'Alarm annunciation for every process variable with a spec, plus the trip inputs feeding the SIS.',
    gotcha: 'Deadband and delay are set to stop the alarm flood, and end up hiding the event. A delay on a protective trip is a real safety trade-off - it belongs in the cause-and-effect document and the MOC, not decided at the HMI screen.',
    status: 'practice'
  },
  {
    id: 'in-integ', mnemonic: 'INTEGRAL / DERIVATIVE', name: 'Integration and rate blocks', category: 'Math / Control',
    symbol: '-[INTG]-', ascii: '-[INTEGRAL]- / -[DERIVATIVE]-',
    iec: 'INTEGRAL, DERIVATIVE (standard FBs in the 2013 edition, with CR_ reset, TI time base, TD filter)', siemens: 'integrator/differentiator FBs / IEC timer variants',
    function: 'Time-integrates a signal (volume from flow) or differentiates it with a first-order filter.',
    usage: 'Totalizers when you have a rate not a pulse count, mass-balance closing, chemical inventory burn-down, rate-of-change for surge/rupture detection.',
    gotcha: 'Integration error accumulates with an offset in the input: a flow transmitter with 0.5% zero error gives you a totalizer that drifts forever. Periodically reset/cross-check against the meter total and alarm the discrepancy.',
    status: 'standard'
  },
  {
    id: 'in-srlim', mnemonic: 'Slew / rate limit (RMF/RMP)', name: 'Ramp / rate limiting', category: 'Motion / Data',
    symbol: '-[RMP]-', ascii: '-[RMP]-',
    iec: 'SR (ramp start/stop) / RPF / POU ramp FBs', siemens: ' Ramp functions / SMOTION PTO RAMP',
    function: 'Moves the output toward the target at a maximum rate instead of instantly.',
    usage: 'Slow-open a J-T or letdown valve on startup, ramp a compressor unload, ramp a setpoint so a cascade does not step its inner loop, protect a cold box from thermal shock.',
    gotcha: 'A rate limit is a control-action decision with process consequences: "how long does it take to get the valve open when the KO drum is rising?" belongs in the trip analysis, not buried in an FB parameter.',
    status: 'practice'
  },
  {
    id: 'in-bsl', mnemonic: 'BSL / BSR / FIFO / LIFO', name: 'Shift register and queues', category: 'Data',
    symbol: '-[BSL]-', ascii: '-[BSL .LEN .POS .DN .OV]-',
    iec: 'ARRAY + index, or vendor queue FB', siemens: 'buffer/register FBs',
    function: 'Shifts bits through a file (barrel shift) or pushes/pops a data queue.',
    usage: 'First-out alarm capture (which trip came first), N-stage sequencing, event history in a small controller without a historian.',
    gotcha: 'First-out built on a shift register is genuinely useful at 3 a.m.; "we will just use the historian" is what you decide after the historian did not get the fast events.',
    status: 'vendor'
  },
  {
    id: 'in-vote', mnemonic: 'voting (1ooN / NooM)', name: 'Redundant input voting', category: 'Reliability',
    symbol: '-[1oo2, 2oo3]-', ascii: '(2oo3) = (A AND B) OR (A AND C) OR (B AND C)',
    iec: 'expressed with AND/OR or a dedicated FB', siemens: 'S7-400H/F-CPU redundancy features',
    function: 'Combines redundant measurements to decide a trip (majority voting) or a value (median/select).',
    usage: '2oo3V for trip sensors to get both safety and availability; 1oo2 for maximum trip sensitivity (e.g. fire detection); median selection for a flow measurement used for control.',
    gotcha: 'Voting changes both safety and spurious-trip rate; it is a LOPA output, not an engineering preference. Also: with 2oo3, one failed sensor means you are running at 1oo2 sensitivity and must know it.',
    status: 'standard'
  }
];

/** Categories used for filter chips in the UI. */
export const INSTRUCTION_CATEGORIES = [
  'Contact', 'Edge', 'Coil', 'Timer', 'Timer / Counter', 'Counter', 'Compare',
  'Data', 'Math', 'Analog', 'Communication', 'Program control', 'Control', 'Alarm',
  'Motion / Data', 'Reliability'
];
