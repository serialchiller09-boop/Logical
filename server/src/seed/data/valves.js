/**
 * VALVES: body types, service/tag acronyms, actuators, accessories, spec terms, field practice.
 *
 * Provenance rules are the same as acronyms.js. Where a tag acronym is company convention rather
 * than standard (very common for valves), status is 'site-specific' and the entry says what to check.
 */

/** ------------------------------------------------------------------ 1. VALVE BODIES */
export const VALVE_TYPES = [
  {
    id: 'v-gate', term: 'Gate valve', function: 'Isolation only. A wedge slides perpendicular to flow; full-bore when open.',
    throttling: 'Not for throttling — partial opening wires out (gutters) the seat and damages the wedge.',
    typical: 'Block/bleed around vessels, meter runs, header isolation, anything that is only ever fully open or fully closed.',
    fields: [
      { label: 'Pressure drop when open', value: 'Very low (full bore)' },
      { label: 'Turns to close', value: 'Many (multi-turn) unless gear-operated' },
      { label: 'Bidirectional', value: 'Usually yes' }
    ],
    variants: ['Slab (through-conduit, pipeline), expanding gate (used where pigs must pass), rising stem vs. non-rising stem (visual open indication)'],
    status: 'practice'
  },
  {
    id: 'v-globe', term: 'Globe valve', function: 'Throttling and regulation. Flow turns around a plug seated in the body throat.',
    throttling: 'Its reason for existing: good seat-guided plug, fine control near the setpoint.',
    typical: 'Control valve bodies (FCV/LCV/PCV), bypasses, letdown, small bore manual regulation.',
    fields: [
      { label: 'Pressure drop when open', value: 'High (tortuous path)' },
      { label: 'Flow characteristic', value: 'Equal percentage or linear, trim dependent' },
      { label: 'Direction', value: 'Flow usually under the plug; arrow on body' }
    ],
    variants: ['Cage-guided (high pressure drop, anti-noise), angle valve (90-degree turn built into body), cryogenic globe with extended bonnet'],
    status: 'practice'
  },
  {
    id: 'v-ball', term: 'Ball valve', function: 'Quarter-turn isolation. A perforated sphere rotates 90 degrees.',
    throttling: 'Poor — nearly full flow for most of the stroke, then nothing. V-notch ball is the exception, made for modulation.',
    typical: 'ESD/SDV/BDV services, block valves, tank outlets, anything needing fast reliable shutoff.',
    fields: [
      { label: 'Shutoff', value: 'Bubble-tight achievable with soft seats' },
      { label: 'Actuation', value: 'Quarter-turn: compact rack-and-pinion or scotch-yoke' },
      { label: 'Cavities', value: 'Trapped-liquid cavities need relief (see trunnion note)' }
    ],
    variants: ['Trunnion (anchored ball, lower torque, large bore/hp), floating ball (ball presses into downstream seat), full bore vs. reduced bore, vented trunnion to bleed the upstream cavity'],
    status: 'practice'
  },
  {
    id: 'v-butterfly', term: 'Butterfly valve', function: 'Disc rotates in the flow stream; quarter-turn isolation and coarse throttling.',
    throttling: 'Usable but with limited rangeability and high seat wear near closed.',
    typical: 'Large low-pressure gas, cooling water, fan/louver bypass, utility headers, burner air.',
    fields: [
      { label: 'Pressure drop', value: 'Moderate — disc is always in the stream' },
      { label: 'Face-to-face', value: 'Short; light on large bore' },
      { label: 'Caution', value: 'High-torque-to-close at large sizes; check actuator sizing at differential pressure' }
    ],
    variants: ['Lug vs. wafer (lug allows dead-end service), high-performance double-offset, triple-offset for metal-seated hot service'],
    status: 'practice'
  },
  {
    id: 'v-plug', term: 'Plug valve', function: 'Tapered or cylindrical plug with a bored passage; quarter- or multi-turn isolation.',
    throttling: 'Limited; V-port plugs exist.',
    typical: 'Wellhead and choke manifolds, sour service, sampling, where a robust simple device is wanted.',
    fields: [
      { label: 'Lubrication', value: 'Lubricated plugs need a lube system; non-lubricated need compatible seats' },
      { label: 'Advantage', value: 'No cavity to trap fluid (vs. ball); good with solids' }
    ],
    variants: ['Expandable plug (seal-on-lift), sleeve-trim plug (recessed sleeve seals both ports)', 'Cocked/pinned manifold plug valves on wellheads'],
    status: 'practice'
  },
  {
    id: 'v-needle', term: 'Needle valve', function: 'Fine throttling with a conical point; very small Cv.',
    typical: 'Impulse lines, sample points, gauge isolation and zeroing, chem injection metering, instrument bypass.',
    fields: [{ label: 'Do not confuse with', value: 'a globe valve for process flow — needle = precision small bore' }],
    status: 'practice'
  },
  {
    id: 'v-check', term: 'Check / non-return valve (NRV)', function: 'Automatic, flow-direction-dependent: opens on forward differential, closes on reversal.',
    throttling: 'None — it is not a control device.',
    typical: 'Compressor discharge, pump discharge, line to a common header, anywhere backflow is unacceptable.',
    fields: [
      { label: 'Key limitation', value: 'Closes by gravity/reverse flow only. It may stick open or leak at static differential, and closure cannot be verified without a test.' },
      { label: 'Implication for safety', value: 'Where API 14C / company practice calls for a positively-closing safety valve, an NRV is generally not an acceptable substitute — an FSV-type device with verified closure is.' }
    ],
    variants: ['Swing, lift, dual-plate, tilting-disc, silent/spring-assisted (anti-water-hammer)'],
    sources: [{ label: 'API RP 14C / ISO 10418 FSV-vs-NRV practice', url: 'https://industrialmonitordirect.com/blogs/knowledgebase/api-14c-fsv-vs-nrv-placement-alternative-configuration-compliance' }],
    status: 'practice'
  },
  {
    id: 'v-relief', term: 'Relief valve (PRV/PSV)', function: 'Spring-loaded automatic opening at a set pressure to protect against overpressure; recloses at blowdown.',
    typical: 'Every vessel and block that can be overpressured, per the relief case list and API 520/521 sizing.',
    fields: [
      { label: 'Not a control device', value: 'A relief valve that lifts routinely means the control loop or the case study is wrong.' },
      { label: 'Conventional vs. balanced bellows', value: 'Balanced types are used where back pressure varies' },
      { label: 'Popping vs. modulating', value: 'Pilot-operated types modulate and hold closer to set' }
    ],
    status: 'standard'
  },
  {
    id: 'v-choke', term: 'Choke valve', function: 'Restricts flow to control rate and, in gas service, produce a pressure drop (and the associated J-T temperature change).',
    typical: 'Well testing, flowline rate control, gas lift injection, letdown where erosion is expected.',
    fields: [
      { label: 'Trim', value: 'Erosion-resistant, often tungsten carbide; multiplier/plug-and-sleeve styles' },
      { label: 'Auto-choke', value: 'Hydraulic ACR (adjustable choke) controlled by upstream/downstream pressure or temperature' },
      { label: 'Sizing', value: 'Choked (critical) flow across the restriction is a normal operating point — flow then depends on upstream pressure, not downstream' }
    ],
    status: 'practice'
  },
  {
    id: 'v-xv', term: 'On-off valve (XV)', function: 'Two-position actuated valve: fully open or fully closed, no modulation.',
    typical: 'Chemical injection, fuel gas pilot supply, seal gas switchover, degassing lines, sequence steps.',
    fields: [{ label: 'Why "X"', value: 'ISA-5.1 assigns X to unclassified. XV is convention for a solenoid/actuated block valve; some registers reserve it for the SIS trip valve and use SV/UV for others. Check the legend.' }],
    status: 'site-specific'
  },
  {
    id: 'v-diaphragm', term: 'Diaphragm valve', function: 'Weir or straight-through pinch on a flexible diaphragm; no cavity, wetted parts isolated.',
    typical: 'Caustic/amine service with solids, chemical injection, water treatment, sample conditioning.',
    status: 'practice'
  },
  {
    id: 'v-pig', term: 'Pig trap / launch-receive valve', function: 'Barrel plus closures allowing a pig to be inserted or recovered while the line stays pressurized (with a vent/purge path).',
    typical: 'Gathering lines, NGL and condensate lines.',
    fields: [{ label: 'Interlock', value: 'The classic rung here: launching must be inhibited while a closure is open or the vent is not closed — a position-permissive chain, usually with limit switches (ZSO/ZSC).' }],
    status: 'practice'
  }
];

/** ------------------------------------------------------------------ 2. SERVICE / TAG ACRONYMS */
export const VALVE_ACRONYMS = [
  { id: 'va-fcv', tag: 'FCV', expansion: 'Flow control valve', drivenBy: 'FIC / FC loop (AO)', airAction: 'Usually air-to-open', failsafe: 'Spring to close (de-energize closed) unless the upset case needs the opposite', note: 'FCV is descriptive, not an ISA-5.1 mandated tag. The tag on the P&ID will often be the loop number: FV-1234, with FCV as the line-label convention.', status: 'practice' },
  { id: 'va-pcv', tag: 'PCV', expansion: 'Pressure control valve', drivenBy: 'PIC / PDIC', airAction: 'Air-to-open on letdown; air-to-close where keeping pressure in matters', failsafe: 'Chosen by the upset case, not by habit', status: 'practice' },
  { id: 'va-lcv', tag: 'LCV', expansion: 'Level control valve', drivenBy: 'LIC', failsafe: 'Separator dump to a downstream vessel commonly fails closed to protect the next stage; compressor suction scrubber dump fails closed to stop liquid carryover to the machine — confirm per case', status: 'practice' },
  { id: 'va-tcv', tag: 'TCV', expansion: 'Temperature control valve', drivenBy: 'TIC (bypasses a cooler, trims fuel, or admits tempering flow)', status: 'practice' },
  { id: 'va-hcv', tag: 'HCV', expansion: 'Hand control valve', drivenBy: 'None — manual, operator-positioned', note: 'Often the manual bypass around an auto control valve: the plant can run on the HCV while the FCV is off-line for maintenance.', status: 'practice' },
  { id: 'va-hic', tag: 'HIC / HV', expansion: 'Hand indicating controller / hand valve', drivenBy: 'Operator setpoint (HIC gives an AO with local indication)', status: 'practice' },
  { id: 'va-sdv', tag: 'SDV', expansion: 'Shutdown valve', drivenBy: 'SIS output (DO), fail closed', failsafe: 'Spring/pilot to closed. Solenoid de-energized = close, so a loss of power or a cut solenoid circuit trips closed (de-energize to trip).', note: 'SDV/ESDV/ESV/ESD are used interchangeably in industry for the same function.', status: 'practice' },
  { id: 'va-esdv', tag: 'ESDV', expansion: 'Emergency shutdown valve', drivenBy: 'ESD/SIS output', failsafe: 'Fail closed', note: 'Same device class as SDV; naming differs by company.', status: 'practice' },
  { id: 'va-bdv', tag: 'BDV', expansion: 'Blowdown valve (depressuring valve)', drivenBy: 'SIS/ESD output to flare', failsafe: 'Frequently NORMALLY OPEN / spring-to-open or pilot-held-closed so that loss of pilot pressure DEPRESSURES the section — the opposite bias of an SDV, deliberately.', note: 'Rate matters: a BDV is sized to bring pressure down within a target time, not just to be open.', sources: [{ label: 'SDV/BDV actuator spring direction (EIT iceweb)', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' }], status: 'practice' },
  { id: 'va-gdv', tag: 'GDV', expansion: 'Gas depressurization valve (company-convention synonym for BDV)', note: 'Not a standard designation. If you see GDV, confirm it against your cause-and-effect matrix before assuming it is a BDV.', status: 'site-specific' },
  { id: 'va-mov', tag: 'MOV', expansion: 'Motor operated valve', drivenBy: 'Motor (part-turn or multi-turn) with torque limits and position feedback', failsafe: 'No inherent fail-safe; a motor stops where it stops unless a spring/flywheel/gear drive is fitted', note: 'Chosen where actuation force is high and response time is not critical, or on large gas headers with no instrument air.', status: 'practice' },
  { id: 'va-sol', tag: 'SV / solenoid', expansion: 'Solenoid valve (pilot)', drivenBy: 'DO from PLC/SIS', note: 'The solenoid is normally the PILOT that directs air or hydraulic pressure to the main valve. So a solenoid failure and a valve failure are different faults with the same symptom: valve will not stroke.', status: 'practice' },
  { id: 'va-xv', tag: 'XV', expansion: 'On-off (block) valve, actuated', drivenBy: 'DO via solenoid', failsafe: 'Spring to closed in most injection/isolation duties', status: 'site-specific' },
  { id: 'va-prv', tag: 'PRV / PSV / RV', expansion: 'Pressure relief valve / pressure safety valve / relief valve', drivenBy: 'Process pressure against a spring (or pilot)', failsafe: 'Not applicable — it exists for the case where everything else failed', status: 'practice' },
  { id: 'va-trv', tag: 'TRV', expansion: 'Thermal relief valve', note: 'Protects a liquid-filled section isolated between two valves (e.g. between an SDV and an upstream block) from thermal expansion. Placed on the isolated segment, small bore, usually piped to a safe location.', status: 'practice' },
  { id: 'va-rd', tag: 'RD', expansion: 'Rupture disc', note: 'Non-reclosing; single-use. Often in series with a PSV with a monitored space between them (burst/leak detection).', status: 'practice' },
  { id: 'va-fsv', tag: 'FSV', expansion: 'Flowline safety valve', note: 'API 14C family: a positively-closing valve that prevents backflow from a common flowline/headers onto the wellhead. Preferred over an NRV because closure can be verified.', sources: [{ label: 'API RP 14C / ISO 10418', url: 'https://industrialmonitordirect.com/blogs/knowledgebase/api-14c-fsv-vs-nrv-placement-alternative-configuration-compliance' }], status: 'standard' },
  { id: 'va-ssv', tag: 'SSV', expansion: 'Surface safety valve (surface shutdown valve)', note: 'API 14C: fail-safe-closed, sliding gate or ball, hydraulically or pneumatically operated, at the wellhead/separator. Note that SSV/SDV/ESV are industry abbreviations kept in use even where they do not follow ISA lettering.', sources: [{ label: 'API RP 14C (abbreviations kept despite ISA)', url: 'https://www.studocu.com/en-us/document/boomerang-university/english/api-rp-14c-safety-systems-analysis-design-for-offshore-platforms/160783133' }], status: 'standard' },
  { id: 'va-usv', tag: 'USV', expansion: 'Underwater safety valve', note: 'API 14C family, subsea location; typically sliding gate, hydraulic or pneumatic.', status: 'standard' },
  { id: 'va-bsd', tag: 'BSDV', expansion: 'Boarding shutdown valve', note: 'On the platform/facility end of a subsea flowline; commonly gate or ball, manual or automated.', status: 'standard' },
  { id: 'va-scssv', tag: 'SCSSV', expansion: 'Surface-controlled subsurface safety valve', note: 'In the production tubing. Fail-safe CLOSED: hydraulic control-line pressure holds the flapper open; loss of that pressure closes it on a spring. Tubing-retrievable or wireline-retrievable.', status: 'standard' },
  { id: 'va-sscsv', tag: 'SSCSV', expansion: 'Subsurface-controlled subsurface safety valve', note: 'Closes on a flow condition sensed downhole (excess flow / differential across a flow bean / rate of pressure loss). Wireline retrievable; often called a "storm choke".', status: 'standard' },
  { id: 'va-glsdv', tag: 'GLSDV', expansion: 'Gas lift shutdown valve', note: 'Gas lift injection line isolation; gate or ball; recognized in the BSEE surface production safety equipment list.', status: 'standard' },
  { id: 'va-icv', tag: 'ICV', expansion: 'Interval control valve (inflow control)', note: 'Downhole/completion device adjusting inflow along a wellbore. Distinct from a "process control valve" — do not map it to an AO.', status: 'vendor' },
  { id: 'va-cv-generic', tag: 'CV', expansion: 'Control valve (generic) — and separately, the flow coefficient Cv', note: 'Two different meanings in one string. In a tag it means "control valve"; in sizing it means the flow coefficient. Read the surrounding document.', status: 'practice' },
  { id: 'va-puv', tag: 'PUV / purge valve', expansion: 'Purge or ventilation valve on a vessel/flare header', status: 'site-specific' },
  { id: 'va-divert', tag: 'DV / diverter valve', expansion: 'Diverter (sends a stream to one of two destinations)', status: 'site-specific' },
  { id: 'va-asrv', tag: 'ASRV / anti-surge valve', expansion: 'Recycle valve keeping a centrifugal compressor out of surge', note: 'Needs high stroke speed and a positioner with tight deadband; its control law is usually a dedicated anti-surge controller, not a plain PID, and the trip path is separate.', status: 'practice' }
];

/** ------------------------------------------------------------------ 3. ACTUATORS & FAIL-SAFE */
export const ACTUATORS = [
  {
    id: 'a-pneu-sr', term: 'Pneumatic spring-return (diaphragm or piston)', function: 'Air pressure moves the valve; a spring returns it on loss of air.',
    fields: [
      { label: 'Fail-safe', value: 'Inherent — that is the whole reason it is chosen' },
      { label: 'Speed', value: 'Fast (spring energy, not actuator power, sets stroke time)' },
      { label: 'Needs', value: 'Clean, dry instrument air; a filter/regulator; often a positioner' }
    ],
    note: 'The workhorse of gas plant control valves. Air-to-open (ATO) vs. air-to-close (ATC) is a property of the assembly, not of the valve body.',
    status: 'practice'
  },
  {
    id: 'a-pneu-da', term: 'Pneumatic double-acting', function: 'Air drives both directions; no return spring.',
    fields: [{ label: 'Fail-safe', value: 'None unless an air volume tank or spring module is added' }, { label: 'Why use it', value: 'Higher thrust, lower air consumption, gentler stroke on large valves' }],
    status: 'practice'
  },
  {
    id: 'a-pneu-qt', term: 'Rack-and-pinion / scotch-yoke (quarter-turn)', function: 'Converts linear piston or diaphragm motion to 90-degree rotation for ball/plug/butterfly.',
    fields: [{ label: 'ESD note', value: 'Quarter-turn is the usual ESD choice for speed of closure' }],
    status: 'practice'
  },
  {
    id: 'a-elec', term: 'Electric (multi-turn / part-turn, MOV)', function: 'Motor + gear train, with torque and limit switching.',
    fields: [
      { label: 'Fail-safe', value: 'Not inherent. Motor stops in position; on power loss the valve holds.' },
      { label: 'Stroke time', value: 'Slow — seconds to minutes' },
      { label: 'Feedback', value: 'Torque switch, limit switch (ZSC/ZSO), position transmitter (ZT), and often a clutch for manual handwheel' }
    ],
    note: 'Where instrument air is unavailable or the valve is huge. Never assume an MOV will "fail safe" — it fails in place.',
    status: 'practice'
  },
  {
    id: 'a-hyd', term: 'Hydraulic / electro-hydraulic (HPU)', function: 'Pump + accumulator + pilot valve; solenoid directs fluid.',
    fields: [
      { label: 'Fail-safe', value: 'By accumulator + spring/pilot design; solenoid de-energized state defines the trip' },
      { label: 'Where', value: 'Large or high-pressure SDV/BDV, wellhead and subsea systems, subsea ESD with accumulator banks' },
      { label: 'Common failure', value: 'External leak of control fluid, or a fouled pilot — both present as "fails to stroke"' }
    ],
    status: 'practice'
  },
  {
    id: 'a-sol', term: 'Solenoid (direct-acting or pilot)', function: 'Electrically switched flow of air/hydraulic fluid; the usual "DO-to-trip" element.',
    fields: [
      { label: 'De-energize to trip', value: 'The safety-aligned choice: a broken wire or lost power produces a trip, not a stuck-open valve' },
      { label: 'Watch', value: 'Pilot-operated solenoids need a minimum differential to shift; a 3-way/2-way choice and the exhaust path matter' }
    ],
    status: 'practice'
  },
  {
    id: 'a-failsafe', term: 'Fail-safe action (FC / FO / FL / FA)', function: 'The position the valve assumes when its motive power or signal is lost.',
    fields: [
      { label: 'FC', value: 'Fail closed (spring to close / air to open)' },
      { label: 'FO', value: 'Fail open (spring to open / air to close) — typical for BDV/depressuring' },
      { label: 'FL', value: 'Fail last position (double-acting, MOV) — a property of the actuator, not a design wish' },
      { label: 'FA', value: 'Fail as required / any (latched or sequence-dependent)' }
    ],
    note: 'The correct choice comes from the upset-case study (what does the plant need this valve to do when power, air, and signal all disappear at once?), not from a default. On a P&ID the fail direction is shown by the arrow on the diaphragm symbol.',
    status: 'practice'
  }
];

/** ------------------------------------------------------------------ 4. ACCESSORIES */
export const VALVE_ACCESSORIES = [
  { id: 'x-pos', term: 'Valve positioner', function: 'Closes the loop on stem position: compares the commanded signal with actual position and adjusts air to the actuator until they match.', fields: [{ label: 'Buys you', value: 'Friction/hysteresis compensation, faster response, split-range and characterisation, and diagnostics' }, { label: 'Types', value: 'Pneumatic (nozzle-flapper/baffle), electro-pneumatic "smart" (HART/FF with diagnostics)' }], status: 'practice' },
  { id: 'x-ip', term: 'I/P transducer (current-to-pressure)', function: 'Converts a 4-20 mA command into a 3-15 psi (typical) pneumatic output.', note: 'In ISA lettering a converter is a "Y" function (e.g. PY, FY). Often internal to a smart positioner.', status: 'practice' },
  { id: 'x-afr', term: 'Air filter regulator (AFR / relieving vs. non-relieving)', function: 'Cleans and sets the supply pressure feeding the positioner/actuator.', fields: [{ label: 'Relieving', value: 'Bleeds down automatically when the downstream demand drops; non-relieving traps pressure' }], status: 'practice' },
  { id: 'x-limit', term: 'Limit switches ZSC / ZSO (and ZSOY)', function: 'Prove the valve physically reached fully closed / fully open.', note: 'This is the difference between "we sent it to close" and "it is closed". Any interlock that depends on a valve position must use position feedback, not the output bit.', status: 'practice' },
  { id: 'x-sol', term: 'Solenoid valve (3/2, 2/2, 5/2)', function: 'Electrically switches air or hydraulic fluid to the actuator.', status: 'practice' },
  { id: 'x-quickex', term: 'Quick-exhaust valve / booster relay / volume tank', function: 'Speeds up stroke by sourcing air locally and dumping rapidly.', note: 'On ESD valves the actuator sizing includes the spring torque at the compressed-spring state, with a stated safety factor (commonly 100%). Do not "improve" speed by removing restrictors without re-doing the sizing.', sources: [{ label: 'SDV/BDV torque sizing notes (EIT iceweb)', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' }], status: 'practice' },
  { id: 'x-zt', term: 'Position transmitter ZT', function: 'Continuous analog stem position back to the control system.', note: 'Feeds travel-deviation alarms and lets you distinguish a valve problem from a process problem.', status: 'practice' },
  { id: 'x-handwheel', term: 'Handwheel / clutch (manual override)', function: 'Lets the operator stroke the valve if air or signal is lost.', fields: [{ label: 'Hazard', value: 'A valve left on manual with the auto block still writing an output is a classic mismatch: the HMI says 47%, the stem is wherever the handwheel is.' }], status: 'practice' },
  { id: 'x-lock', term: 'Car-seal / lock open or closed', function: 'Physical proof a valve was not moved.', note: 'Administrative control. A bypassed or locked-isolated SDV is an SIS integrity problem, not a maintenance convenience.', status: 'practice' },
  { id: 'x-tripamp', term: 'Trip amplifier / solenoid driver with diagnostics', function: 'Monitors the solenoid circuit for open/short and drives the fail-safe output.', status: 'practice' },
  { id: 'x-td', term: 'Travel deviation alarm', function: 'Compares commanded position (AO) with measured position (ZT/AI) and alarms beyond a deadband.', note: 'One of the highest-value control-valve alarms: it catches a broken stem connection, a stuck valve, a failed positioner supply, or a handwheel left engaged.', status: 'practice' }
];

/** ------------------------------------------------------------------ 5. SPEC / SIZING TERMS */
export const VALVE_TERMS = [
  { id: 't-cv', term: 'Cv (flow coefficient)', definition: 'US gallons per minute of 60 F water that pass through the valve at 1 psi differential. The sizing figure of merit.', formula: 'Liquid (non-choked): Cv = Q * sqrt(SG / dP), Q in gpm, dP in psi.', note: 'For gas service the sizing equation is different (compressible, with expansion factor and choked-flow limit) — do not apply the liquid formula to a gas letdown.', status: 'standard' },
  { id: 't-rangeability', term: 'Rangeability (turndown)', definition: 'Ratio of maximum to minimum controllable flow. Equal-percentage trim buys rangeability; linear trim does not.', status: 'standard' },
  { id: 't-characteristic', term: 'Inherent vs. installed characteristic', definition: 'Inherent = valve alone at constant pressure drop. Installed = what the loop actually sees once the rest of the system takes pressure. The installed curve is the one you tune to.', status: 'standard' },
  { id: 't-authority', term: 'Valve authority', definition: 'Fraction of total system pressure drop available across the valve at full opening. Low authority flattens the installed characteristic and makes the loop sluggish or jumpy.', status: 'standard' },
  { id: 't-leakage', term: 'Seat leakage class (ANSI/FCI 70-2)', definition: 'Class I-VI; VI is "bubble-tight" (soft seat, measured in bubbles/min). A "bubble-tight" claim is a leakage class, not zero leakage.', sources: [{ label: 'ANSI/FCI 70-2 (formerly ANSI/ISA-B16.104) Control Valve Seat Leakage - named as the document that defines classes I-VI; the class descriptions here are a summary in plant terms, not a quotation', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' }], status: 'standard' },
  { id: 't-firesafe', term: 'Fire-safe / fire-tested', definition: 'Proven pressure containment during and after a fire test. Common test standards: API STD 607 / API 6FA for quarter-turn and non-metallic-seated valves, ISO 10497 / BS 6755 (historically) for general fire testing.', sources: [{ label: 'API Std 607 / API 6FA / ISO 10497 - named as the fire-test documents behind a "fire-safe" claim; the tests themselves are not reproduced here', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' }], status: 'standard' },
  { id: 't-stiction', term: 'Stiction', definition: 'Static friction plus the breakaway "spike": the valve sticks, then moves too far. Shows as a sawtooth on a trend of PV/op with the loop oscillating at a consistent period.', status: 'standard' },
  { id: 't-deadband', term: 'Deadband / hysteresis', definition: 'Change in input that produces no change in output. Some is normal positioner behaviour; too much and the loop hunts.', status: 'standard' },
  { id: 't-cavitation', term: 'Cavitation vs. flashing (liquid service)', definition: 'Both come from pressure falling below vapor pressure. Cavitation = bubbles collapse inside the valve (noise, pitted trim). Flashing = the fluid stays vapor downstream (erosive, sand-blast finish).', status: 'standard' },
  { id: 't-choked', term: 'Choked flow', definition: 'Flow limit reached when the pressure ratio across the restriction makes downstream changes irrelevant. For gas this is the critical pressure ratio; for liquid, vaporization in the vena contracta caps flow.', status: 'standard' },
  { id: 't-stroke', term: 'Stroke time', definition: 'Time from one end stop to the other. Anti-surge and ESD valves have specified stroke times; orifice/restrictor sizing in the air or hydraulic line is how you set them.', status: 'practice' },
  { id: 't-sticking', term: 'Static sticking', definition: 'The dominant failure mode for valves that sit in one position for months (exactly what ESD valves do). This is why PST (partial stroke test) and scheduled stroking exist.', sources: [{ label: 'SIS valve sticking rationale', url: 'https://iceweb.eit.edu.au/process-control/valveweb/sdv-bdv-esd-valves.html' }], status: 'practice' },
  { id: 't-bonnet', term: 'Extended bonnet / cryogenic valve', definition: 'A long bonnet lifts the packing above the cold zone so the packing stays warm, and keeps ice off the stem.', status: 'practice' },
  { id: 't-bellows', term: 'Bellows seal', definition: 'Metal bellows isolates the stem packing path for toxic or costly fugitive service (a real LDAR control). Needs leak detection between bellows and packing.', status: 'practice' },
  { id: 't-bodymaterial', term: 'Trim / body material selection', definition: 'Driven by corrosion (H2S/CO2/chlorides/water), temperature, erosion, and NACE MR0175 / ISO 15156 for sour service.', status: 'standard' }
];

/** ------------------------------------------------------------------ 6. FIELD PRACTICE */
export const VALVE_PRACTICE = [
  { id: 'p-trip-chain', term: 'What an SDV trip actually involves', definition: 'Sensing element -> logic solver -> solenoid/pilot -> actuator fluid path -> stem -> seat -> position switch proof. Any one of those can be the failed element, and only the last one tells you it worked.', howTo: 'In logic, act on the PROVEN position (ZSC), not the commanded output, whenever the consequence of being wrong is a loss of containment.', status: 'practice' },
  { id: 'p-bypass', term: 'Maintaining a control valve online', definition: 'Standard arrangement: upstream block, downstream block, and a manual bypass with its own block. Sequence matters and is worth memorizing so you can do it without a checklist in your head.', howTo: 'To isolate: close bypass, open downstream block (let the valve take the differential), close upstream block, then vent/drain the body. To return: reverse exactly. Never crack an upstream block against a closed downstream block on a liquid-full line.', status: 'practice' },
  { id: 'p-airloss', term: 'Loss of instrument air', definition: 'Every spring-return valve in the plant moves to its fail position at once, and every MOV stops. The air receiver is sized to ride through a short outage; the plant trip logic should not be the only thing deciding what happens.', howTo: 'Know your plant\'s air-loss philosophy before the event: which FCVs close, which BDVs open, and whether the compressor train is already tripped by low air pressure.', status: 'practice' },
  { id: 'p-impulse', term: 'Impulse line and DP cell care', definition: 'On wet or sour gas, the DP measurement is only as good as its tubing: plugs, condensate legs of unequal height, and uninsulated lines in cold weather all create offsets no tuning will fix.', howTo: 'Before you touch PID parameters on a flow or level loop, verify zero and span with the process isolated and confirm both legs are at the same temperature.', status: 'practice' },
  { id: 'p-locked', term: 'Locked-out valves vs. bypassed SIS points', definition: 'They are different things and get conflated in the field. A locked valve is a mechanical isolation done for maintenance; a bypassed SIS input is a defeated protective function. Both must be logged, both must expire, only one is normally visible on the HMI.', howTo: 'Any logic that reads "everything healthy" while an input is in bypass is lying to the operator. Good designs annunciate "bypass active" on the mimic.', status: 'practice' },
  { id: 'p-cv-limit', term: 'Output limits inside the PLC vs. the valve', definition: 'You can clamp an AO in the PLC, in the positioner (travel stops), and in the DCS faceplate. Three different limits on the same valve is how "why does it stop at 61%" investigations start.', howTo: 'Document every clamp in one place (usually the I/O list or the loop folder), and never put a safety function in a soft clamp.', status: 'practice' }
];
