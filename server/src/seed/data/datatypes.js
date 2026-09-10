/**
 * DATA TYPES.
 * Elementary type table transcribed from IEC 61131-3 as implemented by mainstream
 * IEC-compliant runtimes (Rockwell Logix 5000, Siemens TIA/S7, CODESYS-family).
 * Sizes/ranges/defaults below are the standard's definitions; the "gotcha" column is field practice.
 */
export const DATA_TYPES = [
  {
    id: 'dt-bool', name: 'BOOL', group: 'Boolean', bits: 1, range: 'TRUE / FALSE', default: 'FALSE',
    logix: 'BOOL', siemens: 'BOOL',
    use: 'Every discrete: contacts, coils, permissives, trips, Ack bits, mode bits.',
    gotcha: 'A BOOL bit address is the unit of field wiring. "One bit" also means you cannot store a fault reason in it - use an enumeration or a bit-string tag for diagnostics.',
    status: 'standard'
  },
  {
    id: 'dt-sint', name: 'SINT', group: 'Signed integer', bits: 8, range: '-128 to 127', default: '0',
    logix: 'SINT', siemens: 'SINT',
    use: 'Small enumerations, step numbers, alarm counts, index into a small array.',
    gotcha: 'Silently wraps at +/-128. Never use for a cumulative count that can exceed 127.',
    status: 'standard'
  },
  {
    id: 'dt-usint', name: 'USINT', group: 'Unsigned integer', bits: 8, range: '0 to 255', default: '0',
    logix: 'USINT', siemens: 'USINT', use: 'Channel numbers, percent-of-scale bytes.', gotcha: 'Subtracting a larger value from a smaller one wraps to a large positive number, which reads as an enormous flow if you are not looking.',
    status: 'standard'
  },
  {
    id: 'dt-byte', name: 'BYTE', group: 'Bit string', bits: 8, range: '16#00 to 16#FF', default: '0',
    logix: '— (Logix has no BYTE; use USINT)', siemens: 'BYTE',
    use: 'A bundle of 8 flags addressed by bit (Byte.0 ... Byte.7); status words from a drive or an MCC bucket.',
    gotcha: 'Bit string != number. Bitwise intent, so arithmetic on it is a design smell. Bit numbering (LSB = 0) must match the device documentation, not your preference.',
    status: 'standard'
  },
  {
    id: 'dt-int', name: 'INT', group: 'Signed integer', bits: 16, range: '-32,768 to 32,767', default: '0',
    logix: 'INT', siemens: 'INT',
    use: 'Legacy default for analog values and timer presets in many platforms.',
    gotcha: 'The classic gas-plant bug: 32,767 is smaller than a daily total. A sales-gas meter run at 100,000 scf/h overflows an INT within minutes. Use DINT/LINT or REAL for totals and cumulative values.',
    status: 'standard'
  },
  {
    id: 'dt-uint', name: 'UINT', group: 'Unsigned integer', bits: 16, range: '0 to 65,535', default: '0',
    logix: 'UINT', siemens: 'UINT', use: 'Raw ADC/DAC counts (0..65535), Modbus registers, port numbers, index values.',
    gotcha: 'Comparisons with a signed value get type-converted; a negative number in a UINT context becomes a huge value. Check signedness on every compare at a protocol boundary.',
    status: 'standard'
  },
  {
    id: 'dt-word', name: 'WORD', group: 'Bit string', bits: 16, range: '16#0000 to 16#FFFF', default: '0',
    logix: '— (Logix uses UINT/DINT)', siemens: 'WORD',
    use: 'A 16-point status word; the reason "word-oriented" PLCs could pass 16 DIs in one tag.',
    gotcha: 'Word order across a protocol matters: a 32-bit value split into two 16-bit registers can be sent as ABCD or CDAB. Modbus integrations fail on this more than on anything else.',
    status: 'standard'
  },
  {
    id: 'dt-dint', name: 'DINT', group: 'Signed integer', bits: 32, range: '-2,147,483,648 to 2,147,483,647', default: '0',
    logix: 'DINT (the default integer)', siemens: 'DINT',
    use: 'Counts, totals, times in ms, scaled engineering values with fixed point, and Modbus 32-bit pairs.',
    gotcha: 'Integer division truncates: 7/2 is 3, not 3.5. If you need the fraction, cast a source to REAL before the DIV.',
    status: 'standard'
  },
  {
    id: 'dt-udint', name: 'UDINT', group: 'Unsigned integer', bits: 32, range: '0 to 4,294,967,295', default: '0',
    logix: 'UDINT', siemens: 'UDINT', use: 'Cumulative flow totals, long run-hours, sequence numbers.', status: 'standard'
  },
  {
    id: 'dt-dword', name: 'DWORD', group: 'Bit string', bits: 32, range: '16#0000_0000 to 16#FFFF_FFFF', default: '0',
    logix: '— (use UDINT/DINT)', siemens: 'DWORD', use: '32 flag bits in one tag; alarm groups; masking.', status: 'standard'
  },
  {
    id: 'dt-lint', name: 'LINT', group: 'Signed integer', bits: 64, range: '+/-9.22e18', default: '0',
    logix: 'LINT', siemens: 'LINT (not on all platforms)',
    use: 'Fiscal/annual volume totals, epoch timestamps, high-resolution counters.',
    gotcha: 'Not all platforms or all protocols carry 64-bit integers; a Modbus map may have no legal place for one. Check before you design a totalizer on LINT.',
    status: 'standard'
  },
  {
    id: 'dt-real', name: 'REAL', group: 'Floating point', bits: 32, range: 'approx +/-1.18e-38 to 3.40e+38, ~7 significant decimal digits', default: '0.0',
    logix: 'REAL', siemens: 'REAL',
    use: 'The default type for process values: pressures, flows, temperatures, PID variables, scaled analogs.',
    gotcha: '~7 significant digits means "don\'t compare with EQU". Two REALs that should be equal differ in the last bit. Use a deadband: ABS(a-b) < tolerance. Also: REAL cannot exactly represent 0.1, so accumulated small increments drift.',
    status: 'standard'
  },
  {
    id: 'dt-lreal', name: 'LREAL', group: 'Floating point', bits: 64, range: 'approx +/-2.23e-308 to 1.80e+308, ~15-16 digits', default: '0.0',
    logix: 'LREAL', siemens: 'LREAL',
    use: 'Energy totals, integration over long periods, unit conversions where a small error compounds (mass balance, allocation).',
    gotcha: 'Not all math instructions or all fieldbus objects accept LREAL, and some controllers are slower at it. Verify the instruction accepts the type before you convert a totalizer.',
    status: 'standard'
  },
  {
    id: 'dt-time', name: 'TIME', group: 'Time', bits: 32, range: '-24d 20h 31m 23.648s to +24d 20h 31m 23.647s', default: 'T#0s',
    logix: 'Logix timers use .PRE/.ACC as DINT in milliseconds (T#5s literal on ControlLogix); there is no standalone TIME tag type the way IEC has one',
    siemens: 'TIME (T#5s)',
    use: 'Timer presets and durations; literals like T#2s, T#500ms.',
    gotcha: 'The units are the #1 source of wrong delays: is .PRE in ms (Logix) or s (an IEC timer instance)? A "5" typed into a ms preset is 5 ms, not 5 s. Read the manual for the instruction in front of you, not the last controller you worked on.',
    status: 'standard'
  },
  {
    id: 'dt-ltime', name: 'LTIME', group: 'Time', bits: 64, range: 'nanosecond resolution, enormous span', default: 'LTIME#0ns',
    logix: '—', siemens: 'LTIME (S7-1500)',
    use: 'High-resolution timing, SOE-quality timestamps, motion.',
    status: 'standard'
  },
  {
    id: 'dt-date', name: 'DATE / TIME_OF_DAY / DATE_AND_TIME', group: 'Date and time', bits: 32, range: 'DATE: calendar date; TOD: 00:00:00.000-23:59:59.999; DT: both', default: 'D#1970-01-01 / TOD#00:00:00',
    logix: 'Logix uses wall-clock tag + second-based offsets; DT literal forms vary', siemens: 'DATE / DT / TOD',
    use: 'Scheduling (K-type variable in ISA terms: time-of-day control), shift counters, log stamps.',
    gotcha: 'Real-time clock drift plus no time synchronization is why SOE records from two cabinets do not line up after a trip. Use SNTP/PTP where the platform supports it.',
    status: 'standard'
  },
  {
    id: 'dt-string', name: 'STRING / WSTRING', group: 'Text', bits: 'variable (capacity + length + characters)', range: 'Vendor-defined max length; often 82 characters by default', default: "'' (empty)",
    logix: 'STRING with a .LEN member and a character array; WSTRING for 16-bit characters', siemens: 'STRING / WSTRING',
    use: 'Recipe names, alarm text, reason codes to the HMI, operator notes.',
    gotcha: 'Strings are heavy and awkward across protocols. A reason CODE as an enumeration plus a lookup table in the HMI is almost always better than shipping a STRING from the PLC.',
    status: 'standard'
  },
  {
    id: 'dt-array', name: 'ARRAY [lo..hi] OF type', group: 'Derived', bits: 'n x element size', range: 'Explicit index bounds',
    logix: 'Array tag (fixed or variable dimension depending on platform)', siemens: 'ARRAY[..]',
    use: 'Alarm sets, 16 pump headers, a bank of analog inputs, per-stage separator data.',
    gotcha: 'Out-of-range indexing is a real fault, not a compile warning on older runtimes: it can read adjacent memory. Bounds-check any index that comes from a comm message or an operator-entered value.',
    status: 'standard'
  },
  {
    id: 'dt-struct', name: 'STRUCT', group: 'Derived (user-defined)', bits: 'sum of members', range: 'n/a',
    logix: 'UDT (user-defined data type)', siemens: 'STRUCT / derived type',
    use: 'The way a modern gas plant program stays readable: one UDT per machine (compressor, separator, heater) holding PVs, permissives, trips, times, and command bits, with an array of them for repeated equipment.',
    gotcha: 'Design the UDT once and let it govern everything, including the HMI faceplate (add-on instructions + faceplate templates). Ad-hoc tags added "just for this one machine" is how a plant ends up with 11 variants of compressor logic.',
    status: 'standard'
  },
  {
    id: 'dt-union', name: 'UNION', group: 'Derived', bits: 'size of largest member', range: 'Overlapping members',
    logix: '— (not a Logix 5000 construct; equivalent patterns use explicit packing)', siemens: 'UNION',
    use: 'Bit access to a word: view the same 16 bits as a WORD or as 16 BOOLs.',
    gotcha: 'Because members overlap, writing one silently changes the other. That is the point - and the danger.',
    status: 'standard'
  },
  {
    id: 'dt-enum', name: 'ENUM (enumerated)', group: 'Derived', bits: 'backed by an integer', range: 'Declared names',
    logix: 'Logix enumeration type (with aliases)', siemens: 'enum',
    use: 'Modes and states: IDLE/STARTING/RUNNING/STOPPING/TRIPPED; trip-reason codes; sequence steps.',
    gotcha: 'The number behind the name is an implementation detail. Do not bake "State = 3" into Modbus maps or HMI scripts unless the platform guarantees the value.',
    status: 'standard'
  },
  {
    id: 'dt-subrange', name: 'SUBRANGE', group: 'Derived', bits: 'as base type', range: 'e.g. INT(-4095..4095)',
    logix: '— (enforced by convention/validation, not by the type)', siemens: ' subrange types in some runtimes',
    use: 'Constrain a setpoint to a legal range at the type level rather than with a LIM block.',
    status: 'standard'
  },
  {
    id: 'dt-bcd', name: 'BCD', group: 'Legacy encoding', bits: '4 bits per decimal digit', range: 'decimal digits encoded in nibbles',
    logix: '— (use integer + conversion)', siemens: 'BCD (S7 legacy)',
    use: 'Legacy panel instruments, old keypads, some totalizers, and time-of-day clocks.',
    gotcha: 'A BCD value read as binary is wrong in a way that looks plausible (e.g. 1000 vs. 256). If a number is 10x off, check for a BCD/binary mismatch before you touch the loop.',
    status: 'practice'
  },
  {
    id: 'dt-ascii', name: 'ASCII / character', group: 'Legacy encoding', bits: '8 (CHAR) / 16 (WCHAR)', range: 'single character',
    logix: 'Legacy PLC-5/SLC used ASCII files (A-7/A-20) for text; Logix uses STRING', siemens: 'CHAR / WCHAR',
    use: 'Legacy text tags, part numbers, some legacy HMI interfaces.',
    status: 'practice'
  },
  {
    id: 'dt-pulse', name: 'Pulse / count (frequency input)', group: 'Signal-domain type', bits: 'n/a', range: 'counts or Hz',
    logix: 'HIGH_SPEED_COUNTER / HSC instructions and dedicated inputs', siemens: 'HSC / technology object',
    use: 'Turbine meter and gas-totalizer pulses, flow computers, encoder-based position.',
    gotcha: 'Missing pulses = understated revenue. On custody transfer this is not a data-quality issue, it is a contract issue: put a rate-vs-total cross-check in the logic.',
    status: 'practice'
  }
];

/** Type handling rules worth memorizing. */
export const TYPE_RULES = [
  {
    id: 'tr-overflow', title: 'Overflow and wrap',
    body: 'Integer types wrap rather than saturate (unless the runtime explicitly clamps). 32,767 + 1 = -32,768 on an INT. Totalizers, run-hours, and stroke counts are the usual victims. Rule: anything that only ever goes up gets at least a DINT, and cumulative revenue data gets LREAL/LINT plus an independent check.',
    status: 'standard'
  },
  {
    id: 'tr-divzero', title: 'Divide by zero',
    body: 'Behavior is platform-specific: some set a math-error flag and leave the destination unchanged, others produce IEEE infinity/NaN. A NaN propagates through everything downstream and can freeze a PID at an absurd output. Rule: clamp the denominator (a LIMIT block or MAX with a small epsilon) rather than assuming the fault trap will save you.',
    status: 'practice'
  },
  {
    id: 'tr-float-eq', title: 'Never test floats for equality',
    body: 'Use a deadband. ABS(PV - SP) < tolerance, or the equivalent LEQ/GEQ window. This matters doubly on a 4-20 mA AI where the raw count jitters by a few LSB at rest.',
    status: 'standard'
  },
  {
    id: 'tr-rounding', title: 'Rounding and truncation',
    body: 'Integer conversion truncates toward zero by default on most platforms; ROUND uses round-half-away-from-zero or round-half-to-even depending on runtime. When you convert a scaled value into a UINT for a Modbus register, decide deliberately which one you want - and write it down.',
    status: 'practice'
  },
  {
    id: 'tr-endian', title: 'Byte order / word order at protocol boundaries',
    body: 'IEC and Rockwell, and different Modbus masters, disagree on how a 32-bit value maps onto two registers (ABCD vs. CDAB) and on byte order within a register. Symptom: a value that is wrong by a factor of ~65536, or negative. Fix it at the mapping, never with a divide-by-65536 in the program.',
    status: 'practice'
  },
  {
    id: 'tr-scaling', title: 'Scaling an analog input',
    body: 'The general form, and it is the same on every platform:\nEU = EU_lo + ((raw - raw_lo) / (raw_hi - raw_lo)) * (EU_hi - EU_lo)\nIEC 61131-3 gives you this as NORM_X followed by SCALE_X. Rockwell uses SCL (or a CPT expression). For a 4-20 mA signal the raw endpoints are the card\'s counts, not 4 and 20 - look up the card, do not guess.',
    status: 'standard',
    formula: 'EU = EU_lo + ((raw - raw_lo) * (EU_hi - EU_lo)) / (raw_hi - raw_lo)'
  },
  {
    id: 'tr-tagtype', title: 'Tag type vs. data type',
    body: 'A "tag" is a named piece of memory with a data type, scope, and (for I/O) an address. Rockwell tags are controller/program/task scoped with aliases; Siemens uses DBs and absolute addresses historically. The discipline that survives both: keep one name per measurement, and never reference a raw address from two different programs.',
    status: 'practice'
  },
  {
    id: 'tr-retentive', title: 'Retentivity is a property, not a default',
    body: 'RTO accumulators, OTL bits, and counter .ACC values can be retentive - which is a feature for run-hours and a hazard for a mode bit that survives a power cycle. Retentive behavior across a download/restart is separately configurable on most platforms. Know which of your tags survive what.',
    status: 'practice'
  }
];
