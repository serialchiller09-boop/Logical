/**
 * FUNCTION BLOCKS / structured-programming units.
 * The IEC 61131-3 standard block set plus the Logix equivalents a gas plant program actually uses.
 */
export const FUNCTION_BLOCKS = [
  {
    id: 'fb-ton', block: 'TON', family: 'Timer', iec: 'IEC 61131-3 timer FB', logix: 'TON instruction (structure)',
    pins: [{ p: 'IN', d: 'enable / rung power' }, { p: 'PT', d: 'preset duration' }, { p: 'Q', d: 'done' }, { p: 'ET', d: 'elapsed' }],
    behaviour: 'Accumulates while IN is TRUE; Q when ET >= PT; ET resets on IN falling (non-retentive).',
    gasPlant: 'Restart lockout, valve-stroke supervision, purge dwell, delayed auto-initiate after a permissive returns.',
    gotcha: 'PT units. On Logix a TON preset is milliseconds unless you use a T# literal.',
    status: 'standard'
  },
  {
    id: 'fb-tof', block: 'TOF', family: 'Timer', logix: 'TOF',
    pins: [{ p: 'IN', d: 'enable' }, { p: 'PT', d: 'off-delay' }, { p: 'Q', d: 'output, stays true after IN falls' }, { p: 'ET', d: 'elapsed during the delay' }],
    behaviour: 'Q is TRUE while IN is TRUE and for PT after IN goes FALSE.',
    gasPlant: 'Cooling-water and lube run-on, fan run-on after burner shutdown, keeping an alarm displayed after the cause clears.',
    gotcha: 'A TOF restarts its delay on the next rising edge - so a rapidly cycling input holds Q true forever, which looks like a stuck output.',
    status: 'standard'
  },
  {
    id: 'fb-tp', block: 'TP', family: 'Timer', logix: '— (emulate with TON + ONS)',
    pins: [{ p: 'IN', d: 'trigger' }, { p: 'PT', d: 'pulse width' }, { p: 'Q', d: 'guaranteed pulse' }, { p: 'ET', d: 'elapsed' }],
    behaviour: 'Non-retriggerable one-shot: a rising edge at IN produces Q TRUE for exactly PT.',
    gasPlant: 'Injection pulses, guaranteed minimum run or minimum off periods, timed purge bursts.',
    status: 'standard'
  },
  {
    id: 'fb-tonr', block: 'TONR', family: 'Timer', iec: 'retentive on-delay', logix: 'RTO',
    pins: [{ p: 'IN', d: 'enable' }, { p: 'PT', d: 'preset' }, { p: 'Q', d: 'done' }, { p: 'ET', d: 'accumulated (retained)' }, { p: 'R', d: 'reset' }],
    behaviour: 'Accumulates across interruptions; only reset clears ET.',
    gasPlant: 'Run-hours, maintenance intervals, cumulative dry-run exposure, freeze-window duration.',
    gotcha: 'Retentivity across a power cycle is a separate configuration (Logix: retentive vs non-retentive on the instruction/data). Do not assume.',
    status: 'standard'
  },
  {
    id: 'fb-ctu', block: 'CTU', family: 'Counter', logix: 'CTU',
    pins: [{ p: 'CU', d: 'count-up (rising edge)' }, { p: 'R', d: 'reset' }, { p: 'PV', d: 'preset value' }, { p: 'Q', d: 'CV >= PV' }, { p: 'CV', d: 'current value' }],
    behaviour: 'Counts rising edges of CU; Q when CV >= PV; R clears CV.',
    gasPlant: 'Pump strokes, batch counts, starts-per-day, filter cycles, pig-pass detection.',
    status: 'standard'
  },
  {
    id: 'fb-ctud', block: 'CTUD', family: 'Counter', logix: 'CTU + CTD pair on one address',
    pins: [{ p: 'CU / CD', d: 'count up / down' }, { p: 'R', d: 'reset to 0' }, { p: 'LD', d: 'load PV into CV' }, { p: 'PV', d: 'preset' }, { p: 'QU / QD', d: 'upper / lower limit reached' }, { p: 'CV', d: 'current value' }],
    behaviour: 'Bidirectional counter with both limit outputs.',
    gasPlant: 'Inventory in/out on one accumulator, drum count tracking, tank fill cycles.',
    status: 'standard'
  },
  {
    id: 'fb-rtrig', block: 'R_TRIG / F_TRIG', family: 'Edge detection', logix: 'ONS (implicit bit) or OSR/OSF (explicit)',
    pins: [{ p: 'CLK', d: 'monitored signal' }, { p: 'Q', d: 'one scan on the edge' }],
    behaviour: 'Needs an instance (storage) so it can remember the previous scan. Requires a rising edge after a falling edge to fire again.',
    gasPlant: 'Snapshot-on-trip, one increment per event, one command issue per button press, latching a value at the moment a mode changes.',
    gotcha: 'Edge detection at the scan rate means a faster-than-scan pulse can be missed. Where a pulse must never be lost, use a counter input, a latched DI, or an SIS with a faster scan.',
    status: 'standard'
  },
  {
    id: 'fb-srff', block: 'SR / RS', family: 'Bistable', logix: 'OTL / OTU pair',
    pins: [{ p: 'S1 / R', d: 'SR: set dominant' }, { p: 'R1 / S', d: 'RS: reset dominant' }, { p: 'Q1', d: 'state' }],
    behaviour: 'Two mutually-exclusive forms where both inputs true resolves differently: SR sets, RS resets. This is why two blocks exist.',
    gasPlant: 'Alarm memory, trip latch, mode request, acknowledged-but-not-cleared states.',
    gotcha: 'Choosing SR vs RS is a safety decision: what happens when set and reset are simultaneously true (a trip and an acknowledge at once)? Document it.',
    status: 'standard'
  },
  {
    id: 'fb-pid', block: 'PID / PID_LOOPS', family: 'Control', logix: 'PID instruction', siemens: 'PID_Compact / CONT_C',
    pins: [{ p: 'IN / PV', d: 'process variable' }, { p: 'SP', d: 'setpoint' }, { p: 'KS / Kp', d: 'proportional gain' }, { p: 'TN / Ti', d: 'integral time (reset)' }, { p: 'TV / Td', d: 'derivative time (rate)' }, { p: 'Y / CV', d: 'controller output' }, { p: 'LMN_HLM / LMN_LLM', d: 'output limits' }, { p: 'CR_ / reset', d: 'integral reset for windup control' }],
    behaviour: 'Ideal/positional form: Y = Kc * (e + (1/Ti) * integral(e) + Td * de/dt), with output clamps, integral clamps and manual/auto/cascade modes.',
    gasPlant: 'Every regulatory loop in the plant: letdown pressure, level, temperature, glycol circulation, fuel gas header, dew point trim, compressor unload.',
    gotcha: 'Direction: direct acting (open more as PV rises) vs reverse acting is a per-loop decision that must match the valve fail position and the process. Wrong action = positive feedback = runaway, and it can look "stable" until it does not.',
    status: 'standard'
  },
  {
    id: 'fb-limit', block: 'LIMIT / MED', family: 'Selection / clamping', logix: 'LIM (clamp), SEL/MUX (select)',
    pins: [{ p: 'IN / MN / MX', d: 'value, min, max' }, { p: 'OUT', d: 'clamped' }, { p: 'QQ_H / QQ_L', d: 'limit-hit flags' }],
    behaviour: 'LIMIT clamps into a range and flags when it clamped. MED picks the median of three - the standard way to get a fault-tolerant measurement from three transmitters.',
    gasPlant: 'Output clamping, setpoint protection, best-of-three or 2oo3 transmitter selection.',
    gotcha: 'A clamp with no flag hides a saturated loop. Always take the limit-hit output somewhere (alarm, or at least a bit the HMI shows).',
    status: 'standard'
  },
  {
    id: 'fb-sel', block: 'SEL', family: 'Selection', logix: 'SEL',
    pins: [{ p: 'G', d: 'gate' }, { p: 'IN0 / IN1', d: 'two sources' }, { p: 'OUT', d: 'G ? IN1 : IN0' }],
    behaviour: 'Two-input selector driven by a boolean.',
    gasPlant: 'Lead/lag transmitter switchover, online-analyzer-or-fallback selection, remote-vs-local setpoint.',
    status: 'standard'
  },
  {
    id: 'fb-mux', block: 'MUX / DEMUX', family: 'Selection', logix: 'MUX, DEMUX',
    pins: [{ p: 'K', d: 'index' }, { p: 'IN0..INn', d: 'sources' }, { p: 'OUT', d: 'selected value' }],
    behaviour: 'N-input selector on an integer index. DEMUX routes one input to one of N outputs.',
    gasPlant: 'Per-stage setpoint selection from a mode word, routing one AO to one of several valves in a manifold, choosing a recipe.',
    gotcha: 'Index out of range is a fault condition with platform-specific results. Bound it with a limit block first.',
    status: 'standard'
  },
  {
    id: 'fb-normscale', block: 'NORM_X / SCALE_X', family: 'Scaling', logix: 'SCL',
    pins: [{ p: 'MIN / VALUE / MAX', d: 'input range and value' }, { p: 'OUT', d: 'normalized 0.0-1.0 (NORM_X) or scaled value (SCALE_X)' }],
    behaviour: 'NORM_X maps a value in [MIN,MAX] to [0,1]; SCALE_X maps [0,1] to an output range. Chained, they are the general linear scaling pair.',
    formula: 'NORM_X = (VALUE - MIN) / (MAX - MIN) ; SCALE_X = MIN + NORM * (MAX - MIN)',
    gasPlant: 'Any raw-to-engineering conversion, and any write-back to a 4-20 mA output block.',
    status: 'standard'
  },
  {
    id: 'fb-math', block: 'ADD / SUB / MUL / DIV / MOD / ABS / SQRT / EXP / LN / SIN..ATAN', family: 'Arithmetic', logix: 'ADD, SUB, MUL, DIV, NEG, ABS, SQR, SQRT, EXP, LN, SIN, COS, TAN, ASIN, ACOS, ATN',
    pins: [{ p: 'IN1 / IN2', d: 'operands' }, { p: 'OUT', d: 'result' }, { p: 'ENO', d: 'valid-result flag' }],
    behaviour: 'Integer forms truncate and overflow with a status flag; floating forms follow IEEE 754 including infinities and NaN.',
    gasPlant: 'Density compensation for flow, sqrt extraction, BTU conversion, glycol strength correction, dew-point correlation, differential pressure for level.',
    gotcha: 'Check ENO (or the platform error bit) on DIV and SQRT of a possibly-negative value. A NaN in a control block does not announce itself; it just ruins the loop.',
    status: 'standard'
  },
  {
    id: 'fb-hyst', block: 'HYSTERES', family: 'Limits', logix: 'emulate with two compares + latch',
    pins: [{ p: 'IN', d: 'value' }, { p: 'SPAN', d: 'deadband' }, { p: 'OUT', d: 'state with hysteresis' }],
    behaviour: 'Switches on when IN exceeds OUT + SPAN and back when it falls below OUT - a non-latching comparator with memory.',
    gasPlant: 'Pump start/stop levels, fan cycling, compressor load/unload band, heater staging. The general answer to "why does it cycle 40 times an hour".',
    status: 'standard'
  },
  {
    id: 'fb-intg', block: 'INTEGRAL / DERIVATIVE', family: 'Process math', logix: 'use CPT/pid blocks or an explicit accumulate rung',
    pins: [{ p: 'X / KI / TR', d: 'input, integration gain, sample time' }, { p: 'YI', d: 'integral output' }, { p: 'CR_ / X0', d: 'reset / initial value' }],
    behaviour: 'Discrete integration and filtered differentiation with a lag on the derivative (X with TD filter).',
    gasPlant: 'Volume and mass totalizers from a rate, mass-balance closing, ROC detection on pressure for rupture detection.',
    gotcha: 'Integrator offset error accumulates forever; cross-check against an independent total and alarm the disagreement.',
    status: 'standard'
  },
  {
    id: 'fb-lag', block: 'LAG_1 / LAG_2 (first/second order filter)', family: 'Signal conditioning', logix: 'emulate with CPT, or use the AI card filter',
    pins: [{ p: 'X', d: 'input' }, { p: 'TF / TY', d: 'time constant / sample time' }, { p: 'Y', d: 'filtered output' }],
    behaviour: 'Low-pass first-order lag: Y = Y_prev + (X - Y_prev) * dt/(TF + dt).',
    gasPlant: 'Filtering a noisy flow or GC-derived composition before a ratio controller; smoothing an analyzer for a trim loop.',
    gotcha: 'Every filter you add for stability is dead time for protection. Never put a display filter in front of a trip input.',
    status: 'practice'
  },
  {
    id: 'fb-deadtime', block: '_deadtime (transport delay)', family: 'Process model', logix: 'shift-register buffer',
    pins: [{ p: 'IN', d: 'input' }, { p: 'd', d: 'delay' }, { p: 'OUT', d: 'delayed input' }],
    behaviour: 'Buffers a value for a fixed delay - models pipeline transport lag.',
    gasPlant: 'Modeling and simulation of a long gathering line or a dew point analyzer lag; feedforward design.',
    status: 'practice'
  },
  {
    id: 'fb-ramp', block: 'RAMP / SR / Slew rate limit', family: 'Motion / smoothing', logix: 'RMP / motion or a manual CPT slew',
    pins: [{ p: 'SET', d: 'target' }, { p: 'KR / SLOPE', d: 'rate' }, { p: 'Y', d: 'ramped output' }],
    behaviour: 'Moves the output toward the target at a bounded rate.',
    gasPlant: 'Slow opening of a J-T or letdown valve to avoid a thermal shock, ramping a compressor unload, ramping a setpoint so a cascade inner loop is not stepped.',
    status: 'practice'
  },
  {
    id: 'fb-alarm', block: 'Analog alarm supervision', family: 'Alarm', logix: 'ANALOG alarm on the tag + instruction-level limits; dedicated alarm instructions on some platforms',
    pins: [{ p: 'PV', d: 'monitored value' }, { p: 'HH/H/L/LL', d: 'limits' }, { p: 'deadband', d: 'per limit' }, { p: 'on/off delay', d: 'confirmation time' }, { p: 'state', d: 'normal / active / suppressed' }],
    behaviour: 'Limit comparison with deadband and delay, producing annunciating states. ISA-18.2 gives the state model and the priority scheme.',
    gasPlant: 'Every alarm in the plant. The rationalized set, with delays and deadbands chosen deliberately.',
    gotcha: 'Suppression/inhibition states must be visible to the operator. A suppressed alarm that nobody knows is suppressed is worse than a noisy one.',
    status: 'standard'
  },
  {
    id: 'fb-aoi', block: 'Add-On Instruction / Function Block with instance', family: 'Encapsulation', iec: 'FB with instance data', logix: 'AOI', siemens: 'FB in a multi-instance DB',
    pins: [{ p: 'Inputs', d: 'from the caller' }, { p: 'Outputs', d: 'to the caller' }, { p: 'Statics', d: 'persist between calls - this is what makes it a block, not a subroutine' }, { p: 'Local', d: 'scratch, lost on return' }],
    behaviour: 'Reusable typed logic with its own persistent memory. In Logix, an AOI is packaged with properties (bit-mask status for HMI efficiency), visualization (faceplate template), and documentation.',
    gasPlant: 'The way to build a plant program: one machine-control AOI per equipment type (separator, pump, compressor, heater, chem pump, tank) so all instances share behavior and alarms.',
    gotcha: 'Statefulness belongs in statics. If an AOI needs "remember the previous scan", it must own that bit - sharing one global ONS bit between instances gives every machine the same memory.',
    status: 'standard'
  },
  {
    id: 'fb-csd', block: 'Conditional / state logic (SFC step)', family: 'Sequencing', iec: 'SFC (IEC 61131-3 sequential function chart): step, transition, action', logix: 'emulate with an INT step + compares, or CSP/SFC in Studio 5000 on some platforms',
    pins: [{ p: 'Step', d: 'active state' }, { p: 'Transition', d: 'advance condition' }, { p: 'Action', d: 'what the step drives' }, { p: 'Timeout', d: 'dwell exceeded' }],
    behaviour: 'A step is active until its transition condition holds; actions execute while the step is active; a timeout is a first-class part of every step.',
    gasPlant: 'Startup and shutdown sequences, molecular sieve bed switching (typically 2 or 3 beds with timed cycles), amine/glycol unit rolling, filter backwash, chemical tank changeover, pig launching.',
    gotcha: 'Every step needs a defined "what if this never completes" branch. Sequences that hang mid-way are how plants end up with an isolated liquid-full line and no relief path.',
    status: 'standard'
  },
  {
    id: 'fb-comm', block: 'Comm / message blocks', family: 'Communication', logix: 'MSG (CIP read/write), EtherNet/IP adapters', iec: 'vendor library FBs (e.g. Modbus_Master, MB_CLIENT/MB_SERVER)',
    pins: [{ p: 'EN', d: 'trigger - edge detect it' }, { p: 'DN / ER / ER_done', d: 'done / error' }, { p: 'Time-out', d: 'give-up limit' }, { p: 'Link', d: 'target node' }],
    behaviour: 'Asynchronous exchange with another node. The block returns busy while it waits, so the caller owns the timing.',
    gasPlant: 'Reading flow computers and GCs, writing allocation data, pulling drive status/fault words, talking to an RTU over radio or a generator controller.',
    gotcha: 'Four questions every comm block call must answer in the logic: what happens on timeout, on stale data, on wrong-node data, and on a partially-received table? Usually: an age timer, a checksum/range check, and a hold state.',
    status: 'standard'
  },
  {
    id: 'fb-siggen', block: 'Signal generator / test blocks', family: 'Commissioning', iec: 'vendor-specific', logix: 'SIGNAL (Logix simulation instruction)',
    pins: [{ p: 'Waveform / frequency / amplitude / offset / duration / start time', d: 'what to produce and for how long' }, { p: 'OUT', d: 'the synthetic value' }],
    behaviour: 'Injects a sine/square/ramp/triangle into a tag for loop testing.',
    gasPlant: 'Commissioning a PID response, verifying a filter or an override, proving a valve stroking pattern, FAT loop testing with no real process.',
    gotcha: 'It writes a process tag. Every SIGNAL block in a running plant needs to be conditioned by an explicit enable that cannot be left on - and it must be excluded from production builds or documented as a maintenance hook.',
    status: 'vendor'
  }
];

/** Standard function-block families, for the "what exists" overview. */
export const FB_FAMILIES = [
  { id: 'fam-timer', family: 'Timers', blocks: 'TON, TOF, TP, TONR (retentive)', note: 'The four standard IEC timer blocks; Logix exposes TON/TOF/RTO/TP as instructions with .EN/.TT/.DN bits.' },
  { id: 'fam-count', family: 'Counters', blocks: 'CTU, CTD, CTUD', note: 'Rising-edge counting with preset/limit outputs.' },
  { id: 'fam-edge', family: 'Edge detection', blocks: 'R_TRIG, F_TRIG', note: 'Requires instance storage; equivalent to ONS/OSR/OSF.' },
  { id: 'fam-bistable', family: 'Bistables', blocks: 'SR, RS', note: 'Set-dominant and reset-dominant flip-flops.' },
  { id: 'fam-arithmetic', family: 'Arithmetic', blocks: 'ADD, SUB, MUL, DIV, MOD, ABS, MIN, MAX, LIMIT, SQRT, EXP, LN, trig set, EXPT, ROOT, TRUNC, SEL, MUX, SHR/SHL/ROR/ROL, INCR/DECR', note: 'Standard IEC arithmetic, selection, and bit-handling blocks.' },
  { id: 'fam-compare', family: 'Comparison', blocks: 'GT, GE, EQ, NE, LE, LT', note: 'Signed/unsigned discipline matters at protocol boundaries.' },
  { id: 'fam-conversion', family: 'Type conversion', blocks: 'BOOL_TO_x, x_TO_y, ANY_TO_x, TRUNC, ROUND', note: 'Explicit conversion. Implicit conversion is restricted by design - an IEC safety decision worth respecting.' },
  { id: 'fam-string', family: 'String handling', blocks: 'LEN, LEFT, RIGHT, MID, CONCAT, INSERT, DELETE, REPLACE, FIND, EQ/NE/LT... on strings, value-to-string and string-to-value', note: 'Useful for messages and operator prompts; poor fit for control data.' },
  { id: 'fam-select', family: 'Selection & clamping', blocks: 'SEL, MUX, MAX, MIN, LIMIT, MED, HYS_RElay, HYSTERES', note: 'Override architecture, voting selection, and output clamping live here.' },
  { id: 'fam-control', family: 'Control', blocks: 'PID (position form, with limits and manual/auto), and vendor cascade/override structures', note: 'IEC defines a standard PID FB in the 2013 edition; vendor implementations add tuning, gain scheduling, and split-range.' },
  { id: 'fam-process', family: 'Process-specific', blocks: 'INTEGRAL, DERIVATIVE, _deadtime, LAG_1/LAG_2, RAMP/SR, SMOOTH, FILTER', note: 'Model and conditioning blocks; the basis of any simulation or feedforward design.' },
  { id: 'fam-motion', family: 'Motion / ramps', blocks: 'SR (ramp), RAMP, PTO/velocity blocks in motion libraries', note: 'On gas plants these are more often used to rate-limit a valve than to drive a servo.' },
  { id: 'fam-comm', family: 'Communication', blocks: 'Client/server and protocol FBs per vendor library', note: 'The block contract (busy ownership, timeout, error recovery) is part of the safety analysis, not a detail.' }
];
