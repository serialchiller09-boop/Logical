/**
 * GAS PLANT PROCESS STAGES.
 *
 * Structure per stage: what it is for, how it works physically, the equipment that does it,
 * what the control system actually manipulates, and the trip/excursion conditions the logic
 * exists to catch. Numbers are deliberately absent: setpoints, sizes and compositions are
 * plant-specific and belong to the spec, not a pocket reference.
 */
export const PROCESS_STAGES = [
  {
    id: 'st-intro',
    order: 0,
    stage: 'The train, in one paragraph',
    category: 'Overview',
    purpose: 'Take whatever comes out of the ground and make it (a) safe, (b) pipeline-spec, and (c) split into products worth more separately than together.',
    sequence: [
      'Inlet reception and phase separation (removes free liquids and absorbs slugs)',
      'Contaminant removal: acid gas (H2S, CO2), then water (dehydration) - in that order, because sending wet amine-treated gas straight to a cold section without dehydration is how you make hydrates and ice',
      'Guard beds: mercury, and any remaining trace contaminants before cryogenic aluminum equipment',
      'NGL recovery: cool the gas until the heavies condense (J-T, turboexpander, mechanical refrigeration, or lean oil absorption)',
      'Fractionation: split the mixed liquids into products in a train of columns',
      'Compression and conditioning of residue/sales gas to the transmission header',
      'Metering and custody transfer of every product and of the feed',
      'Disposal of what was removed: acid gas to injection or sulfur plant, produced water, flare/relief, emissions control'
    ],
    key: 'Two design rules that explain most of the automation: (1) everything upstream of the cold section exists to protect the cold section; (2) every vessel has a level that will either run over or run out, and both are trips.',
    status: 'practice'
  },

  {
    id: 'st-inlet',
    order: 1,
    stage: 'Inlet reception, slug catching and separation',
    category: 'Separation',
    purpose: 'Remove free liquid (condensate, produced water) and solids, and absorb the slugs that arrive from a multiphase gathering system, so nothing downstream sees a liquid surge.',
    how: 'Gravity: gas up, liquid down, with the residence time and velocity chosen so droplets fall out. Internals (inlet diverter, mesh pad or vane pack, weir) improve the capture. Slug catchers add volume - a vessel large enough to hold a slug while the level controller drains it at a controlled rate.',
    keyEquipment: ['Slug catcher (vessel or multi-pipe "barrel" type)', 'HP / LP / test separator (2-phase or 3-phase)', 'Filter separator', 'Boot for water (three-phase vessels)', 'Level control valves on each liquid outlet', 'Pressure control on the gas outlet', 'Inlet pig launcher/receiver with closure interlocks'],
    controlFocus: [
      'Level (LIC) on every liquid outlet - usually the governing loop of the stage, and the one that must not be tuned tight if the vessel is a surge volume',
      'Pressure (PIC) on the gas outlet - sets the stage pressure and therefore the flash distribution',
      'Interface level (three-phase: oil/water) with a displacer or an interface-sensitive device',
      'Flow to the next stage as the manipulated variable when the separator is used as a surge vessel'
    ],
    tripConditions: [
      'LSHH (high-high level) - liquid carryover to the next stage, or to a compressor. Normally the plant-closing trip.',
      'LSLL (low-low level) - loss of the liquid seal, which blows gas through the dump valve into a low-pressure system or a tank. This is the more dangerous and more underrated trip of the pair.',
      'PSHH - overpressure beyond the vessel design; PSLL/loss of downstream capacity',
      'High differential across the filter separator element (loading/flooding)',
      'Slug catcher high level with the outlet at maximum - i.e. no remaining capacity for the next slug'
    ],
    fieldTruth: 'A "mysterious" separator level loop is nearly always one of: density changed (makeup, temperature, emulsion), a wet leg that is no longer wet, or a mesh pad flooding so the DP sees a different head than the level.',
    status: 'practice'
  },

  {
    id: 'st-compression',
    order: 2,
    stage: 'Gas compression (inlet, booster, boil-up, refrigeration, acid gas, sales)',
    category: 'Compression',
    purpose: 'Move gas against pressure: to reach the plant, to reach the required treating/cryogenic pressure, to return boil-up gas from tanks, to drive refrigeration, or to meet the sales header.',
    how: 'Positive displacement (reciprocating, screw) traps and shrinks a volume - flow is roughly independent of discharge pressure and the machine must never be dead-headed. Dynamic (centrifugal/axial) adds velocity and converts it to pressure - flow is coupled to head, and the surge limit is a real operating boundary.',
    keyEquipment: ['Reciprocating compressor (API 618) with scrubbers on suction', 'Centrifugal compressor (API 617) with an anti-surge recycle valve', 'Screw compressor (API 619 for process screws)', 'Driver: gas engine, gas turbine (API 612), or electric motor with VFD', 'Suction and discharge KO scrubbers', 'Aftercooler, pulsation bottles/surge volumes, lube oil console, dry gas seals with seal-gas panel', 'Crankcase/vibration/temperature machinery protection (API 670)'],
    controlFocus: [
      'Load/unload or capacity control: suction-pressure PIC driving a motor-driven unloader, VFD speed, or a recycle',
      'Anti-surge (ASRV) with a dedicated control law and speed-dependent surge line',
      'Discharge temperature (cooling water or aftercooler control) as the practical head-room limit on a reciprocating machine',
      'Seal gas differential pressure and flow (dry gas seals) - a control loop with trip consequences',
      'Lube oil pressure with pump start/swap logic, and a delay before restart after a trip',
      'Volumetric or energy-balanced throughput allocation across parallel machines'
    ],
    tripConditions: [
      'Low lube oil pressure, low oil level, high oil temperature, and loss of an oil pump running with no standby start',
      'High discharge temperature; high interstage pressure/temperature',
      'High suction pressure / low suction pressure (both: liquid risk and capacity loss)',
      'Vibration danger, axial position (thrust), keyphasor loss on recip: rod load and crosshead overload',
      'Loss of seal gas differential (dry gas seal) - allows process gas into the seal',
      'Surge detection / anti-surge controller failure; open recycle on trip',
      'KO drum high level at the machine suction - the classic liquid-ingestion trip',
      'Overcrash / overspeed on a turbine or engine; loss of the engine ESD signal'
    ],
    fieldTruth: 'A compressor trip usually shows up in the plant as a dozen alarms and one cause. If your logic has no first-out and your historian has no SOE resolution better than the trip, you will spend the outage guessing.',
    status: 'practice'
  },

  {
    id: 'st-sweetening',
    order: 3,
    stage: 'Acid gas removal (amine sweetening) and regeneration',
    category: 'Treating',
    purpose: 'Remove H2S and CO2 to meet the sales gas sulfur/CO2 specification and to protect downstream metallurgy, and concentrate them into a stream that can be disposed of or converted.',
    how: 'Reversible chemical absorption: cool, wet gas goes up a contactor counter-current to a lean aqueous alkanolamine, which reacts with the acid gases into soluble salts. The rich solvent is flashed, filtered, heated against lean solvent, and boiled in the regenerator (typical acid-gas release range around 225 F), releasing concentrated acid gas overhead. Lean solvent is cooled and returned to the top of the contactor.',
    keyEquipment: ['Contactor (tray or packed tower)', 'Inlet separator / scrubber ahead of the contactor (protects against hydrocarbon and water carryover, which cause foaming)', 'Rich/lean cross exchanger', 'Rich amine flash drum (removes dissolved hydrocarbons before the still)', 'Regenerator / stripper / still column with reboiler', 'Overhead condenser and reflux accumulator', 'Lean amine cooler', 'Particulate and carbon beds (removing heat-stable salts and degradation products)', 'Amine strength monitoring, reclaiming unit where fitted'],
    controlFocus: [
      'Circulation rate (ratio to feed gas flow, with a slow trim from outlet H2S/CO2) - the primary handle',
      'Reboiler temperature and duty (fuel gas or steam valve), with a floor to keep the column stripping',
      'Contactor level/bottom and reflux drum level - both protection trips and control handles',
      'Amine strength (density or titration-based) as the slow outer loop on circulation',
      'Flash drum pressure and level; the hydrocarbons returned here are a real product/emissions item',
      'Differential pressure across the contactor for foaming and flooding detection'
    ],
    tripConditions: [
      'Loss of circulation with gas still flowing: the contactor becomes a pass-through and the plant puts sour gas into sales. Needs an immediate sales-gas isolation, not an alarm.',
      'Contactor high-high level (liquid carryover to the outlet filter/sales line)',
      'Reboiler low level (tube exposure, local overheating, amine degradation and a possible leak path)',
      'High contactor DP / foaming indication, plus antifoam injection demand',
      'Amine cooler outlet high temperature (absorption efficiency collapses; the tower stops treating, quietly)',
      'Loss of inlet scrubber level (gas blow-by into the hydrocarbon/liquid system)'
    ],
    solventNotes: ['MDEA is chosen where H2S selectivity over CO2 matters (e.g. a sulfur plant feed that should not be diluted with CO2).', 'Concentration, temperature and loading each have trade-off curves; the "obvious" answer of running more amine costs steam, causes more hydrocarbon absorption, and increases foaming.', 'Heat-stable salts and oxygen ingress destroy solvent quality - a conductivity or pH trend plus lab analysis, not a controller, is the tool.'],
    status: 'practice'
  },

  {
    id: 'st-acidgas',
    order: 3.5,
    stage: 'Acid gas handling: compression, sulfur recovery, injection',
    category: 'Treating byproducts',
    purpose: 'Deal with the concentrated acid gas: convert H2S to sulfur, incinerate, or inject it. The choice is a permit and economics decision, and each option brings its own trip logic.',
    how: 'Claus sulfur recovery burns a third of the acid gas with air to make SO2, then reacts it over catalyst to elemental sulfur, condensing liquid sulfur between stages; tail gas is incinerated or cleaned up further. Acid gas injection compresses it (often with water/liquid dilution) into a disposal formation.',
    keyEquipment: ['Thermal reactor and waste-heat boiler', 'Catalytic converters and sulfur condensers', 'Refractory and incinerator draft control', 'Liquid sulfur pits, degassing, forming or prilling', 'AGI compressor train and injection well header', 'Fuel gas and combustion-air ratio control'],
    controlFocus: [
      'Air/acid-gas ratio (the single quality-and-emissions control on a Claus train): normally a ratio station with a slow trim from an air demand analyzer',
      'Furnace/reactor temperature - a refractory limit and a conversion driver at once',
      'Incinerator temperature and draft',
      'Sulfur pit level and vapor space (H2S and SO2 in the pit area; degassing control)',
      'AGI discharge pressure and flow, with a strong cross-check against injection pressure, and well integrity monitoring'
    ],
    tripConditions: [
      'Loss of combustion air with acid gas flowing (immediate: cut acid gas to the thermal reactor)',
      'High reactor temperature, or low temperature with the unit in service (element conversion stops and emissions spike)',
      'Loss of incinerator draft or a low incinerator temperature: unburned H2S out the stack',
      'AGI: high discharge pressure (well/facility limit), low suction pressure (compressor damage), and any excursion that could break the injection path - an AGI trip has an environmental consequence, not only a production one',
      'Sulfur pit high level or a high H2S/SO2 reading in the pit area'
    ],
    status: 'practice'
  },

  {
    id: 'st-dehydration',
    order: 4,
    stage: 'Dehydration (glycol and molecular sieve)',
    category: 'Conditioning',
    purpose: 'Lower the water dew point so no free water and no hydrates form at the coldest/ highest-pressure point of the system, and so the sales gas meets its water spec.',
    how: 'TEG: absorb water into hot-lean triethylene glycol in a counter-current contactor with trays or packing; regenerate by boiling the water off the rich glycol in a still/reboiler, with the lean purity limited by thermal degradation at atmospheric pressure (hence vacuum regeneration, or stripping gas, when a deeper dew point depression is needed). Molecular sieve: adsorb water on a solid in two or more beds, switching between drying and hot-gas regeneration - capable of far deeper dew points, which is why it sits ahead of cryogenic trains and LNG.',
    keyEquipment: ['Contactor tower with inlet scrubber (liquids must not reach the glycol)', 'Glycol pump (gas-boosted or mechanically driven) and circulation control', 'Rich/lean exchanger, filter/adsorbent beds, surge/day tank', 'Still column, reboiler with a high-temperature limit, condenser, reflux', 'Moisture analyzer at the outlet (the spec instrument)', 'Sieve: two or more beds, switch valves, regeneration gas heater, chiller, and regeneration gas cooler with a condensate boot'],
    controlFocus: [
      'Lean glycol circulation rate (gallons per pound of water removed / per unit gas) - the main handle, usually ratio-based with an outlet-moisture trim',
      'Reboiler temperature (defines lean strength; has a hard upper bound for degradation)',
      'Contactor bottom level; day tank level; flash tank pressure',
      'Sieve: bed switch timing (a sequence, not a PID), regeneration gas flow and heater outlet temperature, cooling rate, and a moisture-breakthrough end-point that shortens the cycle',
      'Inlet temperature control into the contactor (glycol absorption is temperature-sensitive; the water/HC dew point interplay matters at high pressure)'
    ],
    tripConditions: [
      'High-high outlet moisture (dew point excursion) - with a defined action: often isolate sales and/or recycle, sometimes shut in. Whatever the plant decided; it must not be "alarm only" if the pipeline spec is a contract limit.',
      'Contactor high level (liquid carryover into sales or into the cold section)',
      'Reboiler low level (tube exposure) and high temperature (degradation, fire risk on a fired still)',
      'Loss of the glycol circulation itself',
      'Sieve: moisture breakthrough before the scheduled switch (shortens the cycle), high regeneration heater temperature, a bed not fully depressurized against a switch command (valve sequencing interlock)',
      'Glycol carryover into the contactor outlet (foaming/filter failure) - this shows up as glycol downstream and is a real cold-section fouling path'
    ],
    winterTruth: 'Hydrates form on the *cold* side of a letdown, not the warm side. A "line freezes at the J-T valve" event with the dehydration unit nominally running usually traces to a sample system that was not representative, an inlet scrubber that was wet, or inhibitor injection that had quietly stopped. Check the injection counter before you question the lab.',
    status: 'practice'
  },

  {
    id: 'st-guard',
    order: 4.5,
    stage: 'Guard beds: mercury, and trace contaminants',
    category: 'Conditioning',
    purpose: 'Remove the specific poisons that will damage equipment the main treating steps leave alone - above all mercury ahead of aluminum cryogenic exchangers.',
    how: 'Adsorption on a treated solid: sulfur-impregnated activated carbon traps mercury. Similar beds handle residual H2S, oxygen, or mercaptans depending on the plant. Beds are single-use and are monitored by differential pressure plus periodic analysis of the outlet rather than by a control loop.',
    keyEquipment: ['Mercury removal vessel(s), often in series for changeover while in service', 'Desiccant/coalescing filter separators ahead of the cold box', 'Sample points and analyzer upstream/downstream'],
    controlFocus: ['DP across the bed (loading)', 'Outlet mercury/contaminant analyzer with alarm', 'Bed changeover sequence with isolation and depressurizing steps (valve-sequencing interlock)'],
    tripConditions: ['Mercury detected downstream of the guard bed, or loss of the analyzer that proves the bed works', 'Excessive DP (a blocked bed starves the train)', 'Changeover done without proving the new bed isolated the old one'],
    whyItMatters: 'Mercury in an aluminum cold box causes amalgam attack and exchanger failure - a repair measured in months, not hours. The guard bed is a cheap insurance policy, which is exactly why it is neglected.',
    status: 'practice'
  },

  {
    id: 'st-ngl-recovery',
    order: 5,
    stage: 'NGL recovery: cooling and extraction',
    category: 'NGL recovery',
    purpose: 'Condense the ethane-and-heavier (or propane-and-heavier) fraction out of the gas so it can be sold as liquids, and so the residue meets the heating-value spec.',
    how: 'Create a new phase by making the gas cold enough. Options: J-T valve expansion (simple, no moving parts, and it wastes the pressure energy as a free cold source only in the sense that you get nothing back); turboexpander (isentropic work extraction, much colder per unit pressure drop, and it generates power rather than consuming it); mechanical refrigeration (a propane loop chilling the gas); lean-oil absorption. The cold gas then goes to a low-temperature separator where the liquid drops out, and the cold gas leaves the cold box having recovered its cooling against the incoming feed - which is why the exchanger network, not the valve, is the process.',
    keyEquipment: ['Cold box (vacuum-insulated block-fin exchangers)', 'Turboexpander with brake fan or generator and its lube/seal systems', 'J-T valve and its bypass', 'Low-temperature separator (LTS) at the cold end', 'Inlet filter separator, and the dehydration/guard beds ahead of it', 'Recompressor / booster for expander outlet to sales', 'Nitrogen rejection unit where N2 must come out'],
    controlFocus: [
      'Cold box / LTS temperature profile (charge pressure, J-T or expander bypass, and sometimes feed pre-heat) - the real controlled variables are the temperature and pressure balance across the train',
      'Expander speed with an independent overspeed path; charging pressure',
      'LTS level (the one loop that protects everything: liquid carryover to the expander or to the sales line)',
      'Recompressor capacity against the gas balance, so the plant does not "control" by building pressure somewhere unintended',
      'Cold box warm-up/cool-down rate (a ramp, not a PID) - thermal shock is a damage mechanism',
      'Where fitted, methane slip and recovery targets, and the residue heating value as the product spec'
    ],
    tripConditions: [
      'LTS high-high level (liquid to the expander = machine destruction)',
      'Expander overspeed, low lube pressure, loss of seal gas, high bearing temperature',
      'Cold box high pressure / low pressure excursions, and loss of vacuum insulation (which shows first as a warm spot and a performance loss)',
      'Low-temperature limits: minimum design metal temperature is a real trip, not a guideline, and cold is as damaging as hot',
      'Dehydration or guard-bed upset: the logic should treat a dew-point or mercury excursion as a reason to keep the cold section from being fed, and it should be independent of the loop that is chasing the same excursion'
    ],
    status: 'practice'
  },

  {
    id: 'st-fractionation',
    order: 6,
    stage: 'Fractionation of NGL',
    category: 'Fractionation',
    purpose: 'Split the mixed liquids into sellable products in a sequence of columns, each taking one cut at a time.',
    how: 'Distillation: a column with feed near the middle, a reboiler boiling liquid at the bottom and a condenser/reflux returning liquid at the top. Separation quality comes from reflux, stages, pressure and the temperature profile, so a column has a handful of interacting loops and no single "speed" knob. Cut points move with pressure and composition, so a tower is usually operated with a temperature-on-a-sensitivity-tray loop (or a composition-derived trim) rather than a bottom temperature alone.',
    keyEquipment: ['Deethanizer, depropanizer, debutanizer, stabilizer (and pentanizer where fitted)', 'Reboilers (fired, steam, hot oil, or thermosiphon)', 'Overhead condensers, accumulators, reflux pumps', 'Trays or packing, with downcomers designed for the liquid traffic', 'Column pressure control (condenser duty, vent, or a hot bypass)'],
    controlFocus: [
      'Bottom or side-scut temperature (or an inferred composition) driving reboiler duty - the primary separation loop',
      'Reflux flow, as the fast handle and the coupling to the accumulator level',
      'Column pressure (condensing temperature), which is also the temperature scale everything else is measured against',
      'Accumulator and bottom level, with the feed and product draws as the mass balance',
      'Feed preheat against the column pinch, and RVP control on the stabilizer via bottom temperature and pressure'
    ],
    tripConditions: [
      'High column pressure; low pressure (vacuum on a column not designed for it)',
      'Reboiler high level (loss of circulation in a thermosiphon) or low level (dry-out, tube damage, and a fired reboiler that has lost its heat-transfer medium)',
      'Accumulator high level (flooding the condenser) or low level (pump cavitation, then loss of reflux and a runaway)',
      'High bottom temperature against the product or the heater limit',
      'Loss of reflux with the reboiler still hot - the classic way to put uncondensed hydrocarbon to flare'
    ],
    interactions: ['Pressure and temperature are the same control problem on a column - do not tune a temperature loop without knowing what the pressure loop is doing.', 'Feed composition changes shift the whole profile; a column tuned on one feed runs badly on the next.', 'Level loops on an accumulator set the effective reflux; a tight level and a tight reflux flow cannot both be true at once.'],
    status: 'practice'
  },

  {
    id: 'st-metering',
    order: 7,
    stage: 'Metering, analysis and custody transfer',
    category: 'Commercial',
    purpose: 'Measure volume and energy accurately and defensibly, because the plant is paid by the MMBtu and the difference between two numbers is either revenue or a dispute.',
    how: 'A primary element (orifice, ultrasonic, turbine, critical-flow Venturi) + pressure and temperature measurement + composition from a sample system and chromatograph, all combined by a flow computer running the standard equations (AGA-3/API MPMS 14.3 for orifice; AGA-7/9 for ultrasonic and wet gas; compressibility and heating value from AGA-8, GPA 2172 / API MPMS 14.5 / ISO 12213).',
    keyEquipment: ['Meter run with straight-run piping, temperature/pressure transmitters', 'Orifice (with a plate changer and DP cell) or multi-path ultrasonic', 'OSA sample conditioning and heated lines to the GC', 'Online GC and BTU/Wobbe analyzer', 'Flow computer(s), often duplicated, with a totalizer independent of the plant PLC', 'Prover loop or a correlation check where required', 'Metering building, with security, and a documented reference-condition basis'],
    controlFocus: [
      'Nothing is "controlled" at a meter run, but the logic must supervise it: data quality/age, GC sample validity, carrier gas and sample pressure/temperature, and a comparison of plant-computed volume against the fiscal total',
      'A rate-vs-total cross-check on any pulse totalizer catches dropped pulses',
      'Alarm on out-of-range composition (a GC that has drifted gives plausible, wrong energy values)',
      'Water/hydrocarbon dew point and H2S/CO2 analyzers as the spec-compliance measurements, with their own validity logic'
    ],
    tripConditions: [
      'Sales gas off-spec (H2S, CO2, water dew point, heating value) - a shut-in of the sales line or a divert, per the tariff and the plant design',
      'Loss of all redundant analyzers with gas still selling',
      'Meter over-range or loss of the P/T inputs (the flow computer extrapolates happily and wrongly)'
    ],
    fieldTruth: 'Reference conditions are part of the number. A meter "reading 100.3 MMcf/d" is meaningless without 60 F, 14.696 psia (or whatever the contract says). Every discrepancy argument in a gas plant is two people quoting correct numbers on different bases.',
    status: 'practice'
  },

  {
    id: 'st-relief',
    order: 8,
    stage: 'Relief, flare, blowdown and emissions control',
    category: 'Safety & environmental',
    purpose: 'Give every overpressure case somewhere to go, and keep normal operation from venting.',
    how: 'Each protected vessel has a relief device sized for the governing case (blocked outlet, fire, control-failure, thermal expansion, upset of an adjacent system). Relief and blowdown headers route to a flare with a knock-out drum, pilots, and usually steam or air assistance. Non-emergency vapors go to a vapor recovery unit or to fuel gas instead of to the stack.',
    keyEquipment: ['Relief valves (conventional, balanced bellows, pilot-operated) and rupture discs', 'Flare header, flare KO drum, tip, pilots, ignition system', 'Elevated or ground flare with steam assist; pilot gas skid', 'BDVs for controlled depressuring, sized by rate', 'VRU, tank heaters/pumps, and emission-control devices (thermal oxidizer)', 'LDAR program and, where required, continuous emissions monitoring'],
    controlFocus: [
      'Flare KO drum level (high-high closes the header - because a liquid-filled flare header fails in a way you cannot undo)',
      'Header pressure/purge to keep a positive pressure and prevent air ingress',
      'Pilot flame monitoring and auto re-ignition, with fuel gas supply integrity',
      'BDV/SDV sequencing so a section is isolated before it is depressured, and depressured before anyone opens it',
      'Steam assist on smokeless burning (flow or ratio to heating value, not a fixed valve)'
    ],
    tripConditions: [
      'Flare KO drum high-high level, and often a low-low on the same vessel to keep the seal',
      'Loss of all pilots (a flare that is not lit is not a relief system - and continuing to relieve to it is venting raw hydrocarbon)',
      'High flare header pressure, which means the relief devices are being backed up and the sizing basis is invalid'
    ],
    status: 'practice'
  },

  {
    id: 'st-utilities',
    order: 9,
    stage: 'Utilities and the systems that keep the plant running',
    category: 'Utilities',
    purpose: 'Instrument air, nitrogen, fuel gas, cooling water, lube/seal oil, electricity and heat. Every one of these is an interlock input whether or not it is on the P&ID.',
    how: 'Plant air/instrument air from compressors with dryers and receivers (dew point is the spec, and the failure mode is a wet winter morning); nitrogen from membrane/PSA units or a vaporizer with a header pressure control and a low-pressure alarm; fuel gas from a treated header with its own pressure control; cooling water in open or closed loops with temperature and level control; generation or grid supply with a load-shed scheme.',
    keyEquipment: ['Air compressors + dryers + receivers + a dew point analyzer', 'N2 generators/membranes, PSA towers, vaporizers, N2 headers', 'Fuel gas scrubber + PIC + pilot gas skids', 'Cooling water towers, pumps, and chemical treatment', 'House water, firewater, drain and closed-drain systems', 'Generators/engines with their own controls, UPS, MCCs, and the plant load-shed relay'],
    controlFocus: [
      'Instrument air header pressure with unloading and, critically, a low-low that trips the plant in a controlled order rather than in whatever order the valves happen to fail',
      'Air dew point (moisture into a pneumatic valve in winter = a valve that does not move)',
      'N2 header pressure against the points that need inerting/purge, and seal-gas supply integrity',
      'Fuel gas pressure with minimum-flow protection for the pilots',
      'Cooling water flow/temperature and fan staging; loss of cooling as a plant-level trip cause',
      'Power: load-shed hierarchy, and the behavior of every valve and machine when a bus transfers'
    ],
    tripConditions: [
      'Low-low instrument air', 'Loss of N2 to a seal or a purge (Ex p) system', 'Loss of cooling water flow', 'Loss of a critical electrical bus or of the UPS feeding the control system', 'Fuel gas low pressure with pilots at risk'
    ],
    fieldTruth: 'Utility trips are where the "logic did the wrong thing" reports come from, because nobody designed the utility failure mode as a case. Ask what the plant does when air, N2, cooling water, or a bus each fail - separately and together - and check that the answer is written down somewhere.',
    status: 'practice'
  },

  {
    id: 'st-water',
    order: 10,
    stage: 'Produced water, tanks and lease facilities',
    category: 'Liquid handling',
    purpose: 'Handle, separate, treat, inject or dispose of the water that comes with the gas, and store the liquids between stages.',
    how: 'Water drops out in separators and boots, is flashed/deoiled in gun barrels or API-type separators (in the older plants), filtered, and sent to disposal injection, evaporation, or treatment. Tanks are breathed, heated, and level-controlled; a heater treater combines heat and separation at the lease.',
    keyEquipment: ['Water boots and gun barrels, wash tanks', 'Produced-water filters, hydrocyclists, de-oiling equipment', 'Disposal injection pumps and headers; evaporation ponds where permitted', 'Lease tanks, heater treaters, free-water knockout, and the associated burners', 'Pig traps, and the gathering lines between'],
    controlFocus: ['Tank level (with high-high to prevent overflow to atmosphere, and low-low for pump protection)', 'Heater treater firetube/ flame supervision and the water level that protects the tube from dry-firing', 'Emulsion and chemical injection rate', 'Disposal pump pressure against the injection header, with anti-cavitation and flow protection'],
    tripConditions: ['Tank high-high (an overflow is an environmental and often a regulatory event)', 'Low-low level with a pump running (seal damage; and air into a tank that should not have any)', 'Heater treater low water level exposing the firetube, high pressure, or loss of flame', 'Injection pump discharge over-pressure (well/facility limit)'],
    status: 'practice'
  },

  {
    id: 'st-automation',
    order: 11,
    stage: 'The automation architecture around the train',
    category: 'Control system',
    purpose: 'Which layer does what, and why the answer is "three systems, not one".',
    layers: [
      { layer: 'Field devices', does: 'Transmitters, switches, control valves, on/off valves, detectors, machinery probes. Signal is 4-20 mA/HART, fieldbus, or a discrete contact.', rule: 'The device is only as good as its hook-up: impulse lines, thermowell wake frequency, sample conditioning, air quality.' },
      { layer: 'BPCS (PLC/DCS)', does: 'Regulatory control: every PID loop, sequencing, alarms, interlocks for equipment protection, HMI, comms to SCADA/fiscal.', rule: 'It is expected to be in an "up" state and to be changed. Therefore it cannot be your protection layer.' },
      { layer: 'SIS / ESD', does: 'Independent safety instrumented functions: trip inputs (voted), a logic solver designed for it, and outputs to SDVs/BDVs, with a defined safe state, bypass management and proof testing to IEC 61511 / IEC 61508.', rule: 'Physically separate sensors where the SIL claim requires it; no shared final element with the BPCS unless the analysis supports it; the last element de-energizes to trip.' },
      { layer: 'F&G', does: 'Fire and toxic/combustible gas detection, notification, and its own outputs (ESD valves, deluge, pilots, HVAC, alarms).', rule: 'Its voting (1oo2, 2oo2 with delays) is a documented plant decision; the detectors\' calibration and exposure life are a program, not a purchase.' },
      { layer: 'Machinery protection', does: 'Vibration, temperature, thrust, speed, and the trip path for rotating equipment (API 670-type systems) with relay outputs to the ESD logic.', rule: 'It trips faster and more reliably than a PLC scan; do not duplicate it into the BPCS and then argue about which one tripped.' },
      { layer: 'Fiscal / measurement', does: 'Flow computers, GCs, analyzers, sample systems, totalizers - usually a parallel, independent chain with its own network.', rule: 'It has no control action and must not have any; a flow computer with a control output into a plant loop is an audit finding waiting to happen.' },
      { layer: 'Time sync & SOE', does: 'SNTP/PTP so events from different cabinets, and the SIS log, line up in the right order.', rule: 'Without it, a post-trip review cannot determine first-out; that is the difference between a root cause and a theory.' }
    ],
    network: 'Typical: control VLANs separated from business and from fiscal, ring or dual-homed on critical segments, EtherNet/IP or PROFINET for I/O, serial or Modbus to legacy RTUs and meters, and a documented separation between BPCS and SIS networks. Any remote access path into a safety network is a change-management and security question, not a network question.',
    status: 'practice'
  }
];
