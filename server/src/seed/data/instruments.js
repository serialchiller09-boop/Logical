/**
 * TRANSMITTERS / SENSORS / ANALYZERS for gas plant service.
 * Each entry: what it measures, how, where it wins, where it lies to you.
 */
export const INSTRUMENTS = [
  // ---- pressure
  {
    id: 'i-pt', term: 'Pressure transmitter (PT)', variable: 'P', principle: 'Piezoresistive / capacitive sensing diaphragm; output scaled to the calibrated range.',
    fields: [
      { label: 'Reference', value: 'gauge, absolute, or sealed gauge - and they differ by atmospheric pressure. psia = psig + 14.696 at sea level.' },
      { label: 'Typical signal', value: '4-20 mA + HART, or fieldbus' },
      { label: 'Usual I/O', value: 'AI' }
    ],
    strengths: 'Rugged, accurate, cheap per point, huge range of materials.',
    limits: 'Diaphragm damage from over-range or freezing; snubber fill/fluid choice matters on pulsating reciprocator discharge.',
    tags: ['PT', 'PIT', 'PDT', 'PSH', 'PSL', 'PAH'],
    status: 'standard'
  },
  {
    id: 'i-dp', term: 'Differential pressure transmitter (PDT/FDT/LT)', variable: 'dP',
    principle: 'One cell, three jobs: flow across a restriction, hydrostatic level, or pressure/density.',
    fields: [
      { label: 'Flow', value: 'Q is proportional to sqrt(dP) - so the low end of a DP flow meter is where accuracy and turndown die. Square-root extraction must happen exactly once, in one place.' },
      { label: 'Level', value: 'dP = rho * g * h; a dry leg, a wet leg, or a remote seal changes the calibration constant. Density drift shows up as a phantom level change.' },
      { label: 'Zero', value: 'Elevand suppression (zero suppression/elevation) set at calibration for leg height' }
    ],
    strengths: 'Proven, no moving parts, works at high pressure/temperature.',
    limits: 'Two impulse lines that are not at the same temperature or density will offset you invisibly. This is the single most common "mysterious" level/flow bias in gas plants.',
    tags: ['PD', 'PDT', 'FD', 'FDT', 'LT', 'LD'],
    status: 'standard'
  },
  { id: 'i-seal', term: 'Diaphragm seal + capillary', variable: 'P / dP', principle: 'Process pressure transmitted through fill fluid to the cell.', fields: [{ label: 'Why', value: 'Isolate the cell from sticky, corrosive, hot, or solids-laden process, or from a freezing line' }, { label: 'Cost', value: 'Fill-fluid temperature effects add a real error term; mounting height relative to the process flange matters' }], status: 'practice' },
  { id: 'i-strain', term: 'Strain-gauge / piezoresistive gauge', variable: 'Force, weight, load', principle: 'Wheatstone bridge deformation; used on load cells (WT) for tank weighing.', status: 'practice' },

  // ---- level
  {
    id: 'i-gwr', term: 'Guided wave radar (GWR)', variable: 'L', principle: 'Microwave pulse guided down a rod/cable probe; reflection at the dielectric boundary gives distance.',
    strengths: 'Ignores vapor-space conditions; handles foam and turbulence far better than non-contact; can see an interface; works on low-dielectric liquid.',
    fields: [{ label: 'Watch', value: 'Probe coating, crystallization, viscous buildup; probe length limits range' }],
    tags: ['LT', 'LIT'], status: 'practice'
  },
  {
    id: 'i-radar', term: 'Non-contacting radar', variable: 'L', principle: 'Pulsed or FMCW microwaves across the vapor space; time-of-flight or frequency shift.',
    strengths: 'No process contact, so no fouling of a probe; long range; unaffected by vapor, dust, pressure.',
    fields: [{ label: 'Watch', value: 'Low dielectric constant media lose signal; false echoes from internals; heavy foam can absorb the wave' }, { label: 'Note', value: 'Performance drops sharply for media with very low relative dielectric constant' }],
    status: 'practice'
  },
  {
    id: 'i-ultra', term: 'Ultrasonic level', variable: 'L', principle: 'Sound transit time across the vapor space.',
    fields: [{ label: 'Watch', value: 'Affected by temperature gradients, vapor, foam, wind over open sumps - i.e. it degrades exactly when the process is upset' }], status: 'practice'
  },
  {
    id: 'i-hydro', term: 'Hydrostatic / submerged transmitter', variable: 'L', principle: 'dP = rho*g*h measured at the bottom of the vessel.', fields: [{ label: 'Watch', value: 'Density dependent, full stop. On a glycol or amine tower, density changes with strength and temperature, so a "level" reading is partly a concentration reading.' }], status: 'practice' },
  {
    id: 'i-cap', term: 'Capacitance / admittance level', variable: 'L / point level', principle: 'Probe + vessel wall form a capacitor; admittance methods tolerate some coating.', fields: [{ label: 'Watch', value: 'Dielectric constant of the medium and coating on the probe' }, { label: 'Good for', value: 'Slurries, sticky media, point level on glycol/amine' }], status: 'practice' },
  {
    id: 'i-magneto', term: 'Magnetostrictive level', variable: 'L', principle: 'Magnetic float travels a waveguide; torsional pulse timing gives position.', fields: [{ label: 'Strength', value: 'Very high resolution/repeatability; interface measurement with two floats' }, { label: 'Watch', value: 'Clean media only - a gummed-up float is a stuck reading' }], status: 'practice' },
  {
    id: 'i-float', term: 'Float / displacer (LB / magnetic level gauge)', variable: 'L', principle: 'Buoyancy (float) or Archimedes on a submerged displacer - level or interface by density difference.', fields: [{ label: 'Note', value: 'Interface level in a two-phase boot/separator relies on the density difference between phases; it is not a true total level unless densities are known and stable.' }], status: 'practice' },
  {
    id: 'i-fork', term: 'Vibrating fork / tuning fork point level', variable: 'L (point)', principle: 'Damping of a resonating fork when covered by liquid or solids.', fields: [{ label: 'Why it is everywhere', value: 'No calibration, no moving parts, works on density changes, and can be the independent protection layer on a pump suction' }], status: 'practice' },
  {
    id: 'i-nucleonic', term: 'Nucleonic / radiometric gauge', variable: 'L / density', principle: 'Gamma attenuation through the vessel wall.', fields: [{ label: 'Why', value: 'Nothing enters the vessel: works where no probe can survive (high pressure, corrosive, opaque vessel)' }, { label: 'Cost', value: 'Licensing, source security, dose management' }], status: 'practice' },

  // ---- flow
  {
    id: 'i-orifice', term: 'Orifice plate (FE) + DP transmitter', variable: 'F', principle: 'Concentric restriction; flow from dP using AGA-3 / API MPMS 14.3 dimensional and discharge-coefficient rules.',
    fields: [
      { label: 'Needs', value: 'Correct straight run upstream/downstream, plate flatness, bore measurement, and known gas composition for energy conversion' },
      { label: 'Weakness', value: 'Square-root characteristic = poor low-flow resolution; permanent pressure loss; sensitive to wet gas/liquids' }
    ],
    status: 'standard'
  },
  {
    id: 'i-vortex', term: 'Vortex meter', variable: 'F', principle: 'Shedding frequency behind a bluff body is proportional to velocity (Strouhal).', fields: [{ label: 'Strength', value: 'No moving parts, wide turndown, good for steam and gas' }, { label: 'Watch', value: 'Needs a reasonably Reynolds-number-in-range flow; vibration and low flow both kill the signal' }], status: 'practice' },
  {
    id: 'i-coriolis', term: 'Coriolis meter', variable: 'F (mass) + density', principle: 'Phase shift of oscillating tubes is proportional to mass flow.', fields: [{ label: 'Strength', value: 'Direct mass flow and density, independent of composition - the right tool for chemical injection and NGL custody where mass matters' }, { label: 'Watch', value: 'Two-phase/gas-entrained flow destabilizes it; piping stress and vibration coupling' }], status: 'practice' },
  {
    id: 'i-ultraflow', term: 'Ultrasonic flow meter (transit-time)', variable: 'F', principle: 'Downstream minus upstream acoustic transit time.', fields: [{ label: 'Strength', value: 'Non-intrusive (clamp-on) or full-bore with no pressure loss; standard for large gas and liquid lines (AGA-9 for wet gas, AGA-7 for gas)' }, { label: 'Watch', value: 'Needs a clean acoustic path and a velocity profile - clamp-on through lined pipe or with entrained solids degrades badly' }], status: 'standard' },
  {
    id: 'i-turbine', term: 'Turbine meter', variable: 'F', principle: 'Rotor speed proportional to velocity.', fields: [{ label: 'Watch', value: 'Bearing wear and viscosity limits; historically important in gas, now displaced by ultrasonic at custody transfer' }], status: 'practice' },
  {
    id: 'i-mag', term: 'Magnetic flow meter', variable: 'F', principle: 'Conductive fluid through a magnetic field generates a voltage (Faraday).', fields: [{ label: 'Hard limit', value: 'Requires conductive LIQUID and a full pipe - it cannot measure natural gas at all' }], status: 'practice' },
  {
    id: 'i-thermal', term: 'Thermal dispersion flow', variable: 'F (gas mass-ish)', principle: 'Heat carried away from a heated sensor.', fields: [{ label: 'Use', value: 'Fuel gas, air, vent and flare monitoring where accuracy is secondary to knowing "is anything flowing"' }], status: 'practice' },
  { id: 'i-cft', term: 'Critical-flow Venturi / CFT', variable: 'F', principle: 'Sonic flow at the throat; flow set by upstream pressure and temperature.', fields: [{ label: 'Where', value: 'Test separators and well allocation where the drop is large' }], status: 'practice' },

  // ---- temperature
  {
    id: 'i-rtd', term: 'RTD (Pt100)', variable: 'T', principle: 'Platinum resistance vs. temperature; 100 ohm at 0 C.',
    fields: [
      { label: 'Wiring', value: '2-wire adds lead resistance; 3-wire compensates it; 4-wire removes it. The PLC/remote I/O card must match the element wiring.' },
      { label: 'Self-heating', value: 'Excitation current heats the element - a real error at low flow in air/gas' }
    ],
    status: 'standard'
  },
  {
    id: 'i-tc', term: 'Thermocouple', variable: 'T', principle: 'Seebeck voltage of two dissimilar metals, measured against a known reference junction.',
    fields: [
      { label: 'Types', value: 'K (common, oxidizing/inert), J (avoid above ~750 F with rusting), T (cryogenic-friendly), E (high output), N, and R/S/B (high temperature noble metal)' },
      { label: 'Requirement', value: 'Cold junction compensation, and extension wire of the matching alloy. Ordinary copper on a TC circuit is a classic install error.' },
      { label: 'Cryogenic note', value: 'Type T is frequently chosen at very low temperature where base-metal types lose sensitivity' }
    ],
    status: 'standard'
  },
  { id: 'i-tw', term: 'Thermowell (TW)', variable: '(not a transmitter)', principle: 'Pressure boundary + mechanical protection; the sensor is removable.', fields: [{ label: 'The real constraint', value: 'Wake-frequency / vibration fatigue: the well must survive the flow it sits in (ASME PTC 19.3 style evaluation). A poorly sized thermowell sings, then breaks.' }, { label: 'Consequence', value: 'Insertion depth and response time: too short reads the pipe skin, not the process.' }], status: 'standard' },
  { id: 'i-ir', term: 'Infrared / pyrometer', variable: 'T (surface)', principle: 'Radiated energy; emissivity setpoint is the calibration.', fields: [{ label: 'Use', value: 'Heater tubes, flare tips, anything you cannot touch' }, { label: 'Watch', value: 'Emissivity of a scaled or sooted tube changes with cleanliness, so the number drifts with maintenance state' }], status: 'practice' },

  // ---- analysis (the part of a gas plant that is really about gas quality)
  {
    id: 'i-h2s', term: 'H2S analyzer', variable: 'A', principle: 'Lead acetate tape (spot), GC-SCD, electrochemical cell, or metal-oxide depending on range.',
    fields: [{ label: 'Ranges', value: 'Low-range (pipeline spec, gr/100 scf) and high-range (sour feed, %) are completely different instruments' }, { label: 'Why the PLC cares', value: 'A H2S-over-spec analyzer excursion is a real sales-gas trip cause, and it needs its own alarm-delay logic because analyzers drift and sample systems plug' }],
    tags: ['AT', 'AIT', 'ASH', 'AH'], status: 'practice'
  },
  { id: 'i-co2', term: 'CO2 analyzer', variable: 'A', principle: 'IR absorption (NDIR) or computed from a GC.', fields: [{ label: 'Use', value: 'Controlling amine circulation, and confirming the sales CO2 spec' }], status: 'practice' },
  {
    id: 'i-dewpoint', term: 'Water / hydrocarbon dew point analyzer', variable: 'A', principle: 'Capacitance or electrolytic (water); chilled mirror (hydrocarbon dew point, CPM-type).',
    fields: [{ label: 'Why', value: 'This is how the plant proves the dehydration unit is doing its job - the actual pipeline-spec compliance instrument' }, { label: 'Operational truth', value: 'Chilled-mirror HPs need a clean, dry, representative sample; most "dew point excursions" are sample system problems' }],
    status: 'practice'
  },
  { id: 'i-gc', term: 'Process gas chromatograph', variable: 'A', principle: 'Separates C1..C6+, N2, CO2, H2S; feeds composition to the flow computer for energy conversion.', fields: [{ label: 'Automation angle', value: 'Sample system failures and carrier-gas depletion give plausible, wrong values - which is why GC validity/status is wired as a DI and used in logic and trend annotations' }], status: 'practice' },
  { id: 'i-btu', term: 'BTU / Wobbe analyzer (online calorific)', variable: 'A', principle: 'IR or GC-derived heating value; Wobbe index = heating value / sqrt(relative density).', fields: [{ label: 'Why it exists', value: 'Sales gas is traded on energy (MMBtu), not volume; Wobbe matters to the downstream burner' }], status: 'practice' },
  { id: 'i-o2', term: 'Oxygen analyzer', variable: 'A', principle: 'Zirconia or paramagnetic (combustion O2); electrochemical traces (corrosion control).', fields: [{ label: 'Gas plant use', value: 'Combustion air tuning on heaters/compressor engines, and O2 ingress into N2-blanketed or product gas' }], status: 'practice' },
  { id: 'i-hg', term: 'Mercury analyzer', variable: 'A', principle: 'Gold-film / CVAA-type mercury measurement.', fields: [{ label: 'Why', value: 'Feed to a cold box must be mercury-free: mercury attacks aluminum exchangers. Guard bed monitoring is the automation tie-in.' }], status: 'practice' },
  { id: 'i-ph-cond', term: 'pH / conductivity analyzer', variable: 'A', principle: 'Electrode or toroidal conductivity.', fields: [{ label: 'Gas plant use', value: 'Amine and glycol quality, produced water, boiler/cooling water, amine heat-stable salt monitoring' }], status: 'practice' },

  // ---- machinery / discrete
  { id: 'i-vib', term: 'Vibration probe / machinery protection', variable: 'V', principle: 'Eddy-current proximity probes measuring shaft position/orbit; API 670-type machinery protection systems.', fields: [{ label: 'Why it is in a PLC reference', value: 'Alert/danger relays, keyphasor, and thrust/position channels are hardwired protection that typically outranks PLC logic - and it trips the same SDVs you are interlocking.' }], status: 'standard' },
  { id: 'i-speed', term: 'Speed switch / magnetic pickup', variable: 'S', principle: 'Toothed wheel past a probe; frequency = speed.', fields: [{ label: 'Use', value: 'Overspeed trip, coast-down monitoring, and "is it actually turning" permissives for lube-pump logic' }], status: 'practice' },
  { id: 'i-flame', term: 'Flame detector (UV / IR / thermocouple)', variable: 'Y / B', principle: 'Radiation or heat at the burner.', fields: [{ label: 'Failsafe rule', value: 'Loss of flame must close the fuel gas supply; a flame scanner that "reads ok" when the burner is out is a furnace explosion waiting to happen' }, { label: 'Term', value: 'On a P&ID this may appear as FS/FSH (flame switch) or as a Y-type event device; check the legend' }], status: 'practice' },
  { id: 'i-gasdet', term: 'Combustible / toxic gas detector', variable: 'A / G / Y', principle: 'Catalytic bead, IR point/open-path, or electrochemical (toxic).', fields: [{ label: 'Output', value: 'Reported in %LEL for combustible gas; ppm for toxic (H2S, CO). Calibration gas matters: a methane-calibrated IR detector reads a heavier hydrocarbon differently.' }, { label: 'Voting', value: 'F&G functions normally use 1oo2 or 2oo2 in time-delay combinations to balance nuisance trips against detection; the choice is plant-specific' }], status: 'practice' },
  { id: 'i-position', term: 'Valve position feedback (ZS / ZT)', variable: 'Z', principle: 'Limit switches for proven end position; transmitter for continuous travel.', fields: [{ label: 'Rule', value: 'Use ZSC/ZSO for anything that depends on a valve being physically in position. The output coil you wrote is a request, not a fact.' }], status: 'standard' }
];

/** Signal-type conventions tying field devices to controller I/O. */
export const SIGNAL_TYPES = [
  { id: 's-ai', term: 'AI - Analog input', definition: '4-20 mA (or fieldbus value) from a transmitter. Continuous, scaled to engineering units in the controller.', status: 'standard' },
  { id: 's-ao', term: 'AO - Analog output', definition: '4-20 mA to a positioner, I/P, VFD reference, or proportioning valve.', status: 'standard' },
  { id: 's-di', term: 'DI - Discrete input', definition: 'Two-state: pressure/level/temperature switch, ZS, HS, run/fault from an MCC bucket, gas detector.', status: 'standard' },
  { id: 's-do', term: 'DO - Discrete output', definition: 'Solenoid, alarm bell/strobe, starter control, ESD valve pilot.', status: 'standard' },
  { id: 's-rt', term: 'RTD/TC input', definition: 'Dedicated temperature card; the scaling is done by the card (and the element type must be configured).', status: 'standard' },
  { id: 's-hs', term: 'High-speed / counter input', definition: 'Turbine meter pulses, keyphasor, encoder; scan time limits what a normal DI can see - use the dedicated input.', status: 'practice' },
  { id: 's-livezero', term: 'Live zero and fault bands', definition: '4-20 mA nominal; <4 mA and >20 mA are meaningful. A NAMUR-style practice is to report a device failure outside the normal band so the control system can tell a fault from a measurement.', note: 'Confirm the exact band and the input-card fault setting for your installation; the recommendation text is the authority.', status: 'practice' },
  { id: 's-scan', term: 'Scan time / update rate', definition: 'How often the controller reads inputs, executes logic, and writes outputs. Sets the floor on everything: a 100 ms loop cannot protect against a 20 ms surge event, and the anti-surge or F&G response must live somewhere faster than the regulatory PLC if it needs to be.', status: 'practice' },
  { id: 's-isolation', term: 'Isolated vs. non-isolated I/O; channel-to-channel', definition: 'Ground loops and shared commons. Isolation rating and HART resistor placement (one per loop, in series) are the usual culprits in "we have a noisy AI" tickets.', status: 'practice' },
  { id: 's-intrinsic', term: 'IS / zener barrier / galvanic isolator', definition: 'Intrinsically safe limiting circuits for hazardous-area devices. The barrier is part of the loop: its voltage/current limits constrain what device can hang behind it, and loop calculations must include it.', status: 'standard' }
];
