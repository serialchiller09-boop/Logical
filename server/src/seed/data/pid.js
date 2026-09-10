/**
 * CONTROL LOOPS / PID.
 * Terms and equations follow ISA-style notation (Kc, Ti, Td) and are cross-checked against
 * published tuning references. Starting values are labelled as guidelines, never as design values.
 */
export const PID_TERMS = [
  { id: 'pt-sp', term: 'SP', full: 'Setpoint', definition: 'The value the loop is trying to hold. In ISA notation, the target of the measured variable.', note: 'Who owns the SP changes the loop\'s meaning: operator, remote from another controller (cascade), computed by a ratio station, or scheduled. Always know which before tuning.' },
  { id: 'pt-pv', term: 'PV', full: 'Process variable', definition: 'The measured value of what you are controlling, in engineering units.' },
  { id: 'pt-mv-cv', term: 'MV / CV', full: 'Manipulated variable / controller output', definition: 'MV is the thing you move (val %, Hz). CV (controller output) is the 0-100% signal the controller computes. On some systems CV means controlled variable instead - which is the PV. Ambiguity worth resolving before you write a spec.' },
  { id: 'pt-error', term: 'e (error / deviation)', full: 'e = SP - PV', definition: 'The signed difference the controller acts on. Sign convention decides direct vs. reverse acting.' },
  { id: 'pt-kc', term: 'Kc (or Kp)', full: 'Proportional gain', definition: 'Multiplier on the current error. Output contribution = Kc * e.', note: 'Kc = 100 / PB, where PB is proportional band in percent. A proportional band of 200% is a gain of 0.5. Both notations exist on real faceplates.' },
  { id: 'pt-pb', term: 'PB', full: 'Proportional band', definition: 'Percent change in input needed for a 100% change in output. Narrow band = aggressive.', note: 'Older transmitters and some legacy controllers express gain this way, which inverts intuition: increasing PB reduces aggressiveness.' },
  { id: 'pt-ti', term: 'Ti (or reset time, tau_I)', full: 'Integral time', definition: 'Time for the integral term to repeat the proportional contribution. Contribution = (Kc/Ti) * integral(e dt).', note: 'Ti is in the DENOMINATOR: smaller Ti = more integral action. "Increase Ti" makes the loop calmer. This single inversion causes more mis-tuning than any other.' },
  { id: 'pt-ki', term: 'Ki', full: 'Integral gain (repeats per unit time)', definition: 'Ki = Kc / Ti on many controllers, expressed in repeats/min or repeats/sec.', note: 'Two controllers can both show "Ki = 0.5" meaning completely different things. State the units.' },
  { id: 'pt-td', term: 'Td', full: 'Derivative time (rate time)', definition: 'Contribution = Kc * Td * d(PV)/dt. Anticipates, damps, and amplifies noise.', note: 'Most industrial implementations differentiate the PV, not the error, specifically to avoid derivative kick on setpoint changes. Td = 0 gives a PI controller, which is the correct answer for flow and most noisy measurements.' },
  { id: 'pt-action', term: 'Direct / reverse acting', definition: 'Which way the output moves as PV rises. Reverse acting: output decreases as PV rises toward SP (the common case when a valve closes to stop a rise).', note: 'Direction must be consistent through transmitter, controller, and valve (air-to-open vs air-to-close). One inversion in the chain gives positive feedback: the loop will look stable at rest and then diverge on the first real disturbance.' },
  { id: 'pt-mode', term: 'Manual / Auto / Cascade', definition: 'Manual: operator sets output, PV tracked for a bumpless return. Auto: controller computes output from SP and PV. Cascade: SP comes from another controller.', note: 'Logix convention on the PID instruction: 0 = Manual, 1 = Auto, 2 = Cascade. "Tracking" is the mechanism that makes the transition not step the valve.' },
  { id: 'pt-windup', term: 'Integral windup', definition: 'The integral term keeps accumulating while the output is clamped (valve fully open, or the loop in manual), so the controller overshoots badly when it recovers.', countermeasures: ['Clamp the integral separately (MAXI/MINI or LMN_HLM/LLM on the reset accumulation)', 'Back-calculation: subtract (actual - computed) * Kb from the integral', 'Conditional integration: only integrate when the output is not saturated', 'Stop integrating when the PV is outside the controllable region'] },
  { id: 'pt-bumpless', term: 'Bumpless transfer', definition: 'On a manual->auto transition, preload the controller\'s internal states (integral, and sometimes the output) so the first automatic output equals the current manual output.', note: 'Requires the loop to be tracking in BOTH directions: output tracking while in manual, and setpoint tracking in cascade.' },
  { id: 'pt-dbnd', term: 'Control deviation band', definition: 'A configured tolerance band around SP; the loop alarms when PV stays outside it for too long.', note: 'The single best "loop health" indicator you can wire cheaply. A loop quietly pinned at 100% for nine days shows up as a deviation alarm - or as nothing at all.' },
  { id: 'pt-deadbnd', term: 'Valve deadband / positioning tolerance', definition: 'The change in positioner input needed to move the stem. Some is deliberate (stops the valve hunting); too much is limit-cycle factory.', note: 'A loop oscillating with a period of roughly (2 x travel time) with a sawtooth output is usually deadband or stiction, not tuning.' },
  { id: 'pt-stiction', term: 'Stiction', definition: 'Static friction with a breakaway jump. Signature: PV trend with a flat spot then a step; controller output sweeps smoothly while the valve does nothing, then moves too far.', note: 'Diagnose before re-tuning. Lowering Kc to hide stiction leaves you with a slow loop and an untouched valve.' },
  { id: 'pt-hysteresis', term: 'Hysteresis', definition: 'The valve sits at a different position for a given input going up vs going down, from backlash, packing friction, or a worn positioner nozzle.', status: 'standard' },
  { id: 'pt-halving', term: 'Halving / doubling', definition: 'Field rule of thumb when a loop is oscillating: reduce the gain (or double the integral time), then add back cautiously. Direction depends on the symptom.', note: 'It is a heuristic for finding the neighborhood, not a tuning method. If the loop needs a "rule", the plant probably has a deadtime, nonlinear, or a broken final element problem underneath.' },
  { id: 'pt-loop-delay', term: 'Loop delay', definition: 'Transmitter filter + controller scan/execution period + valve stroke time + process transport dead time. Everything in the loop except the process itself.', note: 'If the loop delay is a significant fraction of the process time constant, aggressive tuning is impossible and no tuning method will change that. Fix the delay (or move the measurement, or fix the valve).' },
  { id: 'pt-split', term: 'Split range', definition: 'One controller output drives two (or more) final elements over different portions of the range, e.g. 0-50% to a vent valve, 50-100% to a make-up valve.', note: 'Two ranges of one PID, or two PIDs with output limits, are two different implementations with different failure modes. Also: watch the overlap/gap at the changeover point, and the bump when the second element starts to move.' },
  { id: 'pt-ratio', term: 'Ratio control', definition: 'One flow is held at a fixed ratio to another (chemistry: air/fuel, amine/gas feed, methanol/flow, corrosion inhibitor/production).', note: 'In ISA lettering the ratio is the F modifier: FY (ratio relay) and FFC. The ratio should be adjustable online or the plant cannot follow the gas analysis.' },
  { id: 'pt-ff', term: 'Feedforward', definition: 'Measure the DISTURBANCE and act before the controlled variable moves, instead of reacting.', note: 'Needs a model and a measured disturbance; mismatch leaves offset, so it is normally combined with feedback (the feedback loop cleans up the model error).' },
  { id: 'pt-cascade', term: 'Cascade', definition: 'Outer (primary) loop sets the setpoint of a faster inner loop. Classic gas plant use: level trim driving a flow setpoint, temperature driving a fuel flow, composition driving a solvent rate.', rule: 'The inner loop must be meaningfully faster (a common rule of thumb is 5-10x) than the outer, or cascade buys you nothing but coupling.' },
  { id: 'pt-override', term: 'Override / protective control', definition: 'A constraint loop that takes over when a variable approaches a limit - the high-suction-pressure override on a compressor, or the level override on a letdown valve.', note: 'Selector direction (high select vs low select) and which loop tracks the selected output determine whether the handover is bumpless. This is where "protected" and "actually protected" differ.' },
  { id: 'pt-gainsched', term: 'Gain scheduling', definition: 'Different tuning sets selected by operating point (compressor speed, throughput, number of trains in service).', note: 'Needs a bumpless path when the schedule changes, or the loop jumps exactly when the plant is transitioning - which is when you least want a jump.' },
  { id: 'pt-analyzer-lag', term: 'Deadtime compensation (SMITH / PID_2DOF style)', definition: 'Structures that compensate measured transport delay, e.g. Smith predictor.', note: 'Rare in day-to-day gas plant loops; the honest first move on an analyzer loop is a faster sample system, not a predictor.' },
  { id: 'pt-integrating', term: 'Integrating (self-regulating vs. non) process', definition: 'Level in a vessel with uncontrolled outflow is an INTEGRATING process: it has no steady state, so it behaves nothing like the first-order-plus-dead-time model the standard tuning rules assume.', note: 'On integrating processes the integral term is often unnecessary or harmful; too much Kc gives a period of pure oscillation. This is why level loops are tuned differently from everything else.' }
];

/** Tuning methods that are named, published, and worth recognizing when someone says "we ZN'd it". */
export const TUNING_METHODS = [
  {
    id: 'tm-zn-closed', method: 'Ziegler-Nichols closed-loop (ultimate gain)', needs: 'Ability to put the loop in manual, disturb it, and run with only proportional action on a live-ish process.',
    procedure: ['Kill integral and derivative (Ti = large/none, Td = 0).', 'Raise Kc until the loop sustains constant-amplitude oscillation: that gain is Ku and the period is Pu.', 'Apply the table below.'],
    results: [
      { controller: 'P', Kc: '0.5 * Ku', Ti: 'none', Td: '0' },
      { controller: 'PI', Kc: '0.45 * Ku', Ti: 'Pu / 1.2', Td: '0' },
      { controller: 'PID', Kc: '0.6 * Ku', Ti: 'Pu / 2', Td: 'Pu / 8' }
    ],
    warnings: ['Deliberately driving a process to sustained oscillation is a production risk and can be an emissions/upset event; on a real plant this is a commissioning-window activity with the operations manager in the loop.', 'Z-N settings are aggressive by modern standards (quarter-amplitude decay), and are a poor match for integrating level loops and for loops with large dead time.'],
    sources: [{ label: 'Ziegler-Nichols closed-loop table as published in engineering references' }, { label: 'LibreTexts process dynamics text (classical tuning)' }],
    status: 'practice'
  },
  {
    id: 'tm-zn-open', method: 'Ziegler-Nichols open-loop (reaction curve / step test)', needs: 'A step test with the loop in manual and a reasonably stable operating point.',
    procedure: ['Record the PV response to a step in controller output (FOPDT model).', 'Extract process gain K, time constant T, and dead time L from the tangent/28-63% method.', 'Apply the table below.'],
    results: [
      { controller: 'P', Kc: 'T / (K * L)', Ti: 'none', Td: '0' },
      { controller: 'PI', Kc: '0.9 * T / (K * L)', Ti: 'L / 0.3', Td: '0' },
      { controller: 'PID', Kc: '1.2 * T / (K * L)', Ti: '2 * L', Td: '0.5 * L' }
    ],
    warnings: ['A single step at one operating point says nothing about behavior at the other end of the range: on a control valve with installed-characteristic changes (or a valve near its seat) the "T/K/L" triple is not constant.', 'Direction of the test step matters on a nonlinear valve; do both directions if the loop is important.'],
    sources: [{ label: 'Published FOPDT + Ziegler-Nichols open-loop relations (process control references)' }],
    status: 'practice'
  },
  {
    id: 'tm-imc', method: 'IMC / lambda tuning', needs: 'A process model (K, T, L).',
    procedure: ['Fit K, T, L.', 'Choose a closed-loop time constant lambda (TC): larger = more robust, slower.', 'Apply: Kc = (1/K) * (T + L/2)/(lambda + L/2) ; Ti = T + L/2 ; Td = (T * L) / (2T + L).'],
    results: [{ controller: 'PID (IMC)', Kc: '(1/K)*(T + 0.5L)/(lambda + 0.5L)', Ti: 'T + 0.5 * L', Td: '(T*L)/(2T + L)' }],
    warnings: ['lambda is the entire art: it is a robustness choice, not a number to be optimized by a script. For pure-integrating processes the IMC formulas differ (Ti is set from the desired closed-loop time, not from the process).'],
    sources: [{ label: 'IMC/FOPDT correlations as published in control texts' }],
    status: 'practice'
  },
  {
    id: 'tm-cohen', method: 'Cohen-Coon', needs: 'Same FOPDT identification as open-loop Z-N.',
    procedure: ['Identify K, T, L.', 'Apply the Cohen-Coon correction factors (ratio L/T drives all three terms).'],
    results: [{ controller: 'PI', Kc: '(T/(K*L)) * (0.9 + L/(12T))', Ti: 'Kp-based: L*(30 + 3L/T)/(9 + 20L/T)', Td: '-' }, { controller: 'PID', Kc: '(T/(K*L)) * (4/3 + L/(4T))', Ti: 'L*(32 + 6L/T)/(13 + 8L/T)', Td: 'Kp*4L/(11 + 2L/T)' }],
    warnings: ['Known to be more aggressive than IMC and can be poor at large L/T. It is worth reading a loop\'s numbers against it, not blindly using it.'],
    status: 'practice'
  },
  {
    id: 'tm-manual', method: 'Manual / heuristic on a live loop', needs: 'Trend of PV, SP, and output with the same time axis. Nothing else.',
    procedure: ['Put the loop in manual; step the output; watch PV direction and time behaviour. This catches wrong action and a stuck element before tuning.', 'With auto: if oscillating with a regular period, check whether the period matches the valve travel time (stiction/deadband) rather than the process (tuning).', 'Then adjust one term at a time and watch, not the other way around.'],
    warnings: ['Never tune to make a noisy trend look pretty. Tuning to mask a mechanical problem is how a plant acquires a slow loop and a soon-to-fail valve.'],
    status: 'practice'
  },
  {
    id: 'tm-guidelines', method: 'Published starting guidelines by loop type (NOT design values)',
    table: [
      { loop: 'Flow', Kc: '0.4 - 0.65', Ti: '~6 s (short)', Td: 'none', why: 'Noisy, fast, and derivative amplifies the noise. A filtered PV plus PI is normal; a flow loop that oscillates is usually a rangeability or valve-authority problem.' },
      { loop: 'Pressure', Kc: 'moderate (1-3 typical starting)', Ti: 'tens of s to minutes', Td: 'rarely', why: 'Gas-filled systems can be fast and noisy; liquid-full systems have long transmission delays. Both look like "pressure loop" on a list and are not.' },
      { loop: 'Level', Kc: 'low to moderate', Ti: 'long, or none on an integrating vessel', Td: 'none', why: 'Integrating behavior; the objective is often surge absorption, not holding SP. Derivative on level is almost always wrong.' },
      { loop: 'Temperature', Kc: 'aggressive relative to others (heaters), but Ti long', Ti: 'minutes', Td: 'sometimes useful', why: 'Large time constants and dead time; asymmetric heat/cool needs a split-range or gain-scheduled structure rather than one set.' },
      { loop: 'Composition / dew point / analyzer', Kc: 'gentle', Ti: 'very long', Td: 'none', why: 'Analyzer sample lag dominates; the loop is a trim on something else. Fast control of a slow, biased measurement produces a confident wrong answer.' }
    ],
    warnings: ['These are published classroom ranges used to get into the right decade. The actual values come from the process test and the valve datasheet. Do not copy a table onto a plant and consider the loop commissioned.'],
    status: 'practice'
  }
];

/** Concrete loops found in gas plants: what is controlled, with what, and what breaks. */
export const GAS_PLANT_LOOPS = [
  {
    id: 'lp-sep-p', loop: 'Separator pressure letdown', tag: 'PIC-xxx -> PCV',
    cv: 'Separator gas pressure', mv: 'Gas letdown valve to the next-lower stage or fuel header',
    type: 'Fast, self-regulating; valve near seat at low load',
    notes: 'Pressure control on a stage separator is normally the thing that sets how much liquid the next stage sees. Interaction with the level loop below is real: a pressure step moves the flash and moves the level, so the two loops fight if both are tuned tight.',
    failure: 'Reverse-acting vs direct-acting mismatch after a valve rebuild; PCV fails closed -> separator pressure climbs to relief; fails open -> you lose the stage and the downstream header sees a slug.'
  },
  {
    id: 'lp-sep-l', loop: 'Separator level dump', tag: 'LIC-xxx -> LCV',
    cv: 'Liquid level', mv: 'Oil/condensate or water dump valve',
    type: 'Integrating (outflow restricted by the valve)',
    notes: 'Level is usually the "gentle" loop by intent: the vessel exists to absorb variation, so a tight level setpoint is often the wrong objective. Many plants deliberately run a level band with alarm limits and let the loop float, or control the DUMP valve on flow-ratio and hold level with a slack band.',
    failure: 'DP level cell reading density changes as a level change; a two-phase dump (gas blow-by) makes the valve non-linear and the loop unstable; an iced or waxed valve gives deadband that looks like bad tuning.'
  },
  {
    id: 'lp-teg-circ', loop: 'TEG circulation rate', tag: 'FIC-xxx -> FCV (bypass or pump speed)',
    cv: 'Lean glycol flow to the contactor', mv: 'Glycol pump bypass valve, or VFD on the pump',
    type: 'Slow, noisy pump, and often a bypass valve fighting a positive-displacement pump',
    notes: 'Circulation is frequently set as a rate proportional to gas flow (gallons per Mcf, i.e. ratio control) with a level trim, rather than a fixed setpoint: too little flow and the glycol becomes rich; too much and you waste reboiler duty and carry glycol over.',
    failure: 'A gas-boosted or diaphragm pump does not respond to a valve position the way the PID assumes - the loop integrates against a dead time that is a function of pump cycle rate. Control the pump strokes, not the bypass, if the platform lets you.'
  },
  {
    id: 'lp-teg-temp', loop: 'TEG reboiler temperature', tag: 'TIC-xxx -> fuel gas PCV / TCV',
    cv: 'Reboiler (still pot) temperature', mv: 'Fuel to the reboiler burner, or steam valve',
    type: 'Slow, asymmetric, and bounded hard at the top',
    notes: 'Upper bound matters: overheating degrades TEG. On a vacuum reboiler the target temperature is lower and the achievable lean purity higher, so the temperature setpoint is coupled to the vacuum system - not an independent knob.',
    failure: 'A single PID on fuel flow with no low-fire limit will hunt the burner or flame out. Split-range or a dead band at minimum fire is normal. Loss of flame supervision belongs in burner logic, not in this PID.'
  },
  {
    id: 'lp-amine-circ', loop: 'Lean amine circulation', tag: 'FIC-xxx (ratio to feed gas) + trim from H2S/CO2 analyzer',
    cv: 'Amine flow to the contactor', mv: 'Amine pump bypass / VFD / stroke control',
    type: 'Slow, with a large dead band of acceptable flow',
    notes: 'The classic structure: rate proportional to gas throughput (ratio) with a slow trim from the outlet acid-gas analyzer, and a clamp so circulation cannot drop below the minimum needed to keep the tower wet. Over-riding to minimum flow on low gas rate saves reboiler steam and is why the ratio is online.',
    failure: 'Analyzer dead time (sample + instrument) is minutes: a trim loop tuned for a fast process will integrate a stale measurement and wander. Also: too much circulation is not free - it lifts hydrocarbons and increases foaming risk.'
  },
  {
    id: 'lp-amine-temp', loop: 'Reboiler / still column bottom temperature', tag: 'TIC-xxx -> steam or hot-oil valve', cv: 'Regenerator bottom temperature', mv: 'Reboiler duty',
    type: 'Slow', notes: 'Interacts with amine strength and the reflux rate; the actual quality target (lean loading) is inferred from temperature plus pressure plus concentration, not temperature alone.',
    failure: 'Foaming carries amine overhead: the response is a level problem at the reflux drum, not a temperature problem, and it will be "tuned" uselessly for hours.'
  },
  {
    id: 'lp-fuel-gas', loop: 'Fuel gas header pressure', tag: 'PIC-xxx -> PCV from gas plant residue / booster', cv: 'Fuel gas header pressure', mv: 'Make-up gas valve (and sometimes a vent)',
    type: 'Fast, many consumers, small buffer',
    notes: 'This is the loop everyone depends on and nobody funds. Header pressure collapse trips heaters and pilots, so its setpoint, minimum valve opening, and response to a loss of supply are all plant-stability questions. A split-range (make up vs vent) is common when a VRU can over-supply.',
    failure: 'Consumers step faster than a valve can react, and the loop is fighting the compressor unload logic for the same gas. Also: the header has real capacitance, which makes a "pressure" loop slower than it looks.'
  },
  {
    id: 'lp-dewpoint', loop: 'Dehydration dew point trim', tag: 'AIC-xxx -> glycol circulation or bypass/temperature trim', cv: 'Outlet water (or HC) dew point', mv: 'Circulation rate or contactor temperature',
    type: 'Very slow, nonlinear, biased',
    notes: 'Dew point analyzers are the most likely thing in the plant to be quietly wrong (sample conditioning, chilled mirror contamination). Structure the loop so the trim can be blocked out on a bad-PV signal and so the operator can see the last valid sample time.',
    failure: 'The "spike" that shuts in sales gas is usually a sample system event. This is exactly the case for a confirmation delay plus a quality bit - both of which have to be documented as a risk decision, not a nuisance filter.'
  },
  {
    id: 'lp-jt', loop: 'Cold box / J-T letdown temperature', tag: 'TIC-xxx -> JT bypass or heated-feed bypass', cv: 'Low-temperature separator or cold box outlet temperature', mv: 'Bypass around the J-T valve, or the extent of feed pre-heat',
    type: 'Slow thermal, with hard cold limits',
    notes: 'The control objective on cryogenic extraction is usually the temperature/rate balance across the extraction train, not a single temperature. Materials have minimum design metal temperature: cold is a damage mechanism, not just an off-spec. Any loop that can drive the train colder belongs with a low-temperature limit in the logic.',
    failure: 'Carryover of glycol/brine/water to the cold section, or a level loss in the low-temperature separator that sends liquid down the expander. Both are consequences of letting a temperature loop win over a level or a separation constraint.'
  },
  {
    id: 'lp-expander', loop: 'Turboexpander speed / charging pressure', tag: 'SIC-xxx -> brake fan or generator load, and/or charging pressure PCV', cv: 'Shaft speed (or the power balance)', mv: 'Load on the brake, and the pressure available to the expander',
    type: 'Fast machinery, overspeed-critical',
    notes: 'Expander speed is a power-balance result: gas enthalpy drop in, generator/brake load out. Overspeed protection is an independent trip path (typically a hardwired/mechanical or dedicated protection system), not the speed controller.',
    failure: 'Loss of electrical load with gas still flowing is the overspeed event. If logic exists that closes the expander inlet only on a trip derived from the same controller that regulates it, that is not an independent layer.'
  },
  {
    id: 'lp-antisurge', loop: 'Centrifugal compressor anti-surge', tag: 'ASRV control (dedicated controller / ASRV + positioner)', cv: 'Approach to surge from suction flow and head', mv: 'Recycle valve',
    type: 'Fast, nonlinear, gain-scheduled with speed',
    notes: 'Requirements: measure mass or standard-volume flow (density-compensated) and head; schedule the surge line by speed; give the valve a fast stroke and a control law that opens quickly and closes slowly; keep a hardwired or independent trip path to full open on machine trip.',
    failure: 'A recycle valve tuned for smooth control authority (deadband, slow closes) will surge the machine. The deadband is a real conflict between the loop that saves fuel and the loop that saves a $2M impeller - resolve it in the spec, not in tuning.'
  },
  {
    id: 'lp-aircooler', loop: 'Air-cooled exchanger outlet temperature', tag: 'TIC-xxx -> louver position or fan VFD', cv: 'Process outlet temperature', mv: 'Air flow (louvers, fan speed, or fan staging)',
    type: 'Slow, and asymmetric with ambient',
    notes: 'In winter you need the opposite of the design intent (recirculation, louvers nearly closed, sometimes reverse rotation on some fans). Fan VFD low-frequency limits and louver-stiction are the practical problems.',
    failure: 'A louver that sticks at mid-travel gives an oscillating outlet temperature at night that looks like a tuning problem. Freeze protection on the process side is a control objective too, and often overrides the temperature loop.'
  },
  {
    id: 'lp-stabilizer', loop: 'Stabilizer / de-ethanizer bottoms temperature or RVP trim', tag: 'TIC or FIC cascade -> reboiler duty', cv: 'Product vapor pressure proxy (bottom temperature, or an online RVP calculation)', mv: 'Reboiler duty (fuel/steam) or reflux rate',
    type: 'Slow column dynamics, large dead time, interacts with pressure and feed',
    notes: 'RVP is the product spec; bottom temperature is a proxy. The proxy drifts with feed composition and pressure, so the loop needs a composition-based trim or an operator correction route.',
    failure: 'Feed upset drives both loops hard at once; column flooding, or a reboiler at maximum that the operator is told is "auto".'
  },
  {
    id: 'lp-chem-inj', loop: 'Chemical injection (corrosion inhibitor / methanol / antifoam / scale)', tag: 'FQ/FIC or stroke counter, ratio to production', cv: 'Injection rate or total per period', mv: 'Pump stroke rate / VFD / peristaltic speed',
    type: 'Small flow, intermittent, positive displacement',
    notes: 'Usually ratio to line flow (continuous) or a timed dose per cycle (batch), with a stroke counter proving it actually went in. Low-flow precision is a pump capability, not a PID capability.',
    failure: 'Plugged injection quill, chem tank empty, pump vapor-locked, or a cracked line. Detection: "flow or strokes expected vs actual" discrepancy alarm. Chemical that is not injected costs far more than the alarm that finds it.'
  },
  {
    id: 'lp-flare', loop: 'Flare header pressure / pilot gas', tag: 'PIC on header; pilot gas from a dedicated skid', cv: 'Header pressure (slight positive to prevent air ingress)', mv: 'Purge/vent path',
    type: 'Slow, safety-motivated',
    notes: 'A positive header pressure at all times is the point (air ingress makes a flare stack an explosive mixture). Purge gas flow rate is often the controlled variable with an alarm on low flow, and flame monitoring at each pilot.',
    failure: 'A pressure loop that vents to atmosphere to "protect" the header will destroy the pilot; a loss of purge is not detected by most plants because nobody alarms it.'
  }
];
