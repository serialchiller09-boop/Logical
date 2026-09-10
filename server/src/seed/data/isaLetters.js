/**
 * ISA-5.1 identification letters (the tag-letter grammar).
 * Source basis: ANSI/ISA-5.1-2009 (R2017) "Instrumentation Symbols and Identification",
 * Tables 5.1 (first letters / measured variable) and 5.2 (succeeding letters / function).
 * NOTE: ISA-5.1 explicitly assigns several letters to "user's choice". Those rows carry
 * `permissive: true` and the app refuses to claim a single meaning for them.
 */
export const FIRST_LETTERS = [
  { letter: 'A', variable: 'Analysis', note: 'Composition / property measurement (H2S, H2O, BTU, pH, conductivity, chromatograph).', permissive: false },
  { letter: 'B', variable: 'Burner / Combustion', note: 'Combustion-related variable.', permissive: false },
  { letter: 'C', variable: 'User\u2019s choice', note: 'Commonly Conductivity in the field, but the standard leaves C to the user. Confirm against the plant tag register.', permissive: true },
  { letter: 'D', variable: 'User\u2019s choice', note: 'Commonly Density / Specific gravity; also used for Differential as a modifier in older tags.', permissive: true },
  { letter: 'E', variable: 'Voltage', note: 'Electrical potential (EMF).', permissive: false },
  { letter: 'F', variable: 'Flow', note: 'Flow rate of any stream (gas, liquid, steam).', permissive: false },
  { letter: 'G', variable: 'User\u2019s choice', note: 'Commonly Gauging (position) or Gas/H2S detection in plants; not a standard assignment.', permissive: true },
  { letter: 'H', variable: 'Hand', note: 'Manual action initiated by an operator (hand switch, hand button).', permissive: false },
  { letter: 'I', variable: 'Current', note: 'Electrical current.', permissive: false },
  { letter: 'J', variable: 'Power', note: 'Electrical power (kW/kVA). Rare.', permissive: false },
  { letter: 'K', variable: 'Time / Time schedule', note: 'Elapsed time, scheduling.', permissive: false },
  { letter: 'L', variable: 'Level', note: 'Level, or interface level when the service is two-phase.', permissive: false },
  { letter: 'M', variable: 'User\u2019s choice', note: 'Commonly Moisture / Humidity; also Mass in some registers.', permissive: true },
  { letter: 'N', variable: 'User\u2019s choice', note: 'No standard assignment.', permissive: true },
  { letter: 'O', variable: 'User\u2019s choice', note: 'No standard assignment.', permissive: true },
  { letter: 'P', variable: 'Pressure / Vacuum', note: 'Pressure at or above atmospheric; vacuum when the service is sub-atmospheric. Also used for Pressure differential (PDT).', permissive: false },
  { letter: 'Q', variable: 'Quantity', note: 'Totalized / integrated quantity (e.g. QI, QIT).', permissive: false },
  { letter: 'R', variable: 'Radiation / Radioactivity', note: 'Radiation; also gamma-ray density gauges.', permissive: false },
  { letter: 'S', variable: 'Speed / Frequency', note: 'Rotary speed, cycles per second. S is also a modifier for Safety.', permissive: false },
  { letter: 'T', variable: 'Temperature', note: 'Temperature. TD = temperature differential.', permissive: false },
  { letter: 'U', variable: 'Multivariable', note: 'Two or more measured variables in one device (e.g. P+T flow computer).', permissive: false },
  { letter: 'V', variable: 'Vibration / Mechanical analysis', note: 'As a FIRST letter: vibration or other mechanical analysis. As a SUCCEEDING letter: Valve / damper / louver.', permissive: false },
  { letter: 'W', variable: 'Weight / Force', note: 'Weight, force. W as succeeding letter = Well (thermowell, TW).', permissive: false },
  { letter: 'X', variable: 'Unclassified', note: 'One-off / custom variable not covered by other letters.', permissive: false },
  { letter: 'Y', variable: 'Event / State / Presence', note: 'Presence or state of something. Y as succeeding letter = Relay / compute / convert.', permissive: false },
  { letter: 'Z', variable: 'Position / Dimension', note: 'Physical position or dimension (valve stem travel, damper position).', permissive: false }
];

export const SUCCEEDING_LETTERS = [
  { letter: 'A', function: 'Alarm', kind: 'modifier', note: 'Always combined with a readout or switch letter: PAH, LAL, TAH.' },
  { letter: 'B', function: 'User\u2019s choice', kind: 'modifier', note: 'No standard assignment.' },
  { letter: 'C', function: 'Control', kind: 'active', note: 'Controller: computes an output from a setpoint and a measurement (FIC, PIC, TIC, LIC).' },
  { letter: 'D', function: 'Differential', kind: 'modifier', note: 'Difference between two measurements: PD, FD, TD (PDT, FDT).' },
  { letter: 'E', function: 'Sensor / primary element', kind: 'passive', note: 'The device that first sees the process: FE (orifice plate), TE (thermocouple/RTD).' },
  { letter: 'F', function: 'Ratio', kind: 'modifier', note: 'Ratio of one flow to another; FF = flow ratio, FFC = flow ratio controller.' },
  { letter: 'G', function: 'Glass / viewing device', kind: 'passive', note: 'Local visual only: LG (level gauge), FG.' },
  { letter: 'H', function: 'High', kind: 'modifier', note: 'Elevation qualifier. Doubled for the second, more severe limit: HHH in some registers.' },
  { letter: 'I', function: 'Indicate', kind: 'passive', note: 'Human-readable value: local display or HMI (PI, LI, TI).' },
  { letter: 'J', function: 'Scan', kind: 'modifier', note: 'Scanner / multiplexer (rare).' },
  { letter: 'K', function: 'Control station / time rate of change', kind: 'active', note: 'Operator setpoint station; as a modifier it means rate of change.' },
  { letter: 'L', function: 'Light / Low', kind: 'modifier', note: 'As a readout letter = lamp/indicator; as a modifier = low limit (PSL, LSLL).' },
  { letter: 'M', function: 'Momentary / Middle', kind: 'modifier', note: 'Momentary as first-letter modifier; middle as function modifier.' },
  { letter: 'N', function: 'User\u2019s choice', kind: 'modifier', note: 'No standard assignment.' },
  { letter: 'O', function: 'Orifice / restriction / Open', kind: 'modifier', note: 'Restriction as a modifier; Open as a valve state qualifier (ZSO, ESD-O).' },
  { letter: 'P', function: 'Point (test connection)', kind: 'passive', note: 'Test point. Do not confuse with first-letter P = pressure.' },
  { letter: 'Q', function: 'Integrate / totalize', kind: 'passive', note: 'Cumulative count of a quantity: FIQ, TIQ.' },
  { letter: 'R', function: 'Record', kind: 'passive', note: 'Trend/historian record: PR, FR, TR.' },
  { letter: 'S', function: 'Switch', kind: 'active', note: 'Discrete device that changes state at a limit: PSH, LSL, HS.' },
  { letter: 'T', function: 'Transmit', kind: 'active', note: 'Sends the measurement to a receiving system (4-20 mA, fieldbus): PT, FT, LT, TT.' },
  { letter: 'U', function: 'Multifunction', kind: 'modifier', note: 'Device does more than one function.' },
  { letter: 'V', function: 'Valve / damper / louver', kind: 'active', note: 'Final control element: FCV, PCV, LV, SDV, BDV.' },
  { letter: 'W', function: 'Well', kind: 'passive', note: 'Protection element, not an instrument: TW (thermowell), PW (pressure well).' },
  { letter: 'X', function: 'Unclassified', kind: 'modifier', note: 'No standard assignment.' },
  { letter: 'Y', function: 'Relay / compute / convert', kind: 'active', note: 'Logic or signal conversion: I/P transducer (PY), flow computer (FY), logic solver (SY).' },
  { letter: 'Z', function: 'Driver / actuator / position', kind: 'active', note: 'Final element driver or position function: ZS (position switch), ZT (position transmitter).' }
];

export const LEVEL_QUALIFIERS = [
  { token: 'H', meaning: 'High', note: 'One elevation above normal.' },
  { token: 'HH', meaning: 'High-high', note: 'Second, more severe elevation \u2014 usually the trip or shutdown level.' },
  { token: 'L', meaning: 'Low', note: 'One depression below normal.' },
  { token: 'LL', meaning: 'Low-low', note: 'Second, more severe depression \u2014 usually the trip level (pump dry-run, flame loss).' },
  { token: 'NA', meaning: 'Normal alarm / normal-closed', note: 'Ambiguous in practice. Read the plant legend before trusting it.' }
];
