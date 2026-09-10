/**
 * EXAMPLE RUNGS, part 2 - the ones that look like a real gas plant program.
 */
export const RUNGS2 = [
  {
    id: 'rung-pid-level',
    title: 'Level control loop with manual / auto / cascade modes',
    category: 'Regulatory control',
    level: 'Advanced',
    oneLine: 'How a controller block, a selector and an output limit fit into a ladder program without lying to the operator.',
    purpose: 'Separator liquid level controlling the letdown valve, with a manual station, high-level override (the override wins when level runs away), and tracking so the mode switch is bumpless.',
    boolean: 'CV = PID(LV, SP).CV ; SP_selected = override ? SP_HIGH_LIMIT : SP_OP ; output limited by MIN/MAX and by the override',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'LOOP_AUTO', l: 'In AUTO' },
        { t: 'blk', k: 'PID', a: 'LIC_101', l: 'Level PID', p: [
          { k: 'PV', v: 'SEP1_LV' }, { k: 'SP', v: 'LIC_SP' }, { k: 'CV', v: '-> LCV_AO' },
          { k: 'Kc', v: '1.2' }, { k: 'Ti', v: '8 min' }, { k: 'Td', v: '0' }, { k: 'Mode', v: '1 = Auto' }
        ] },
        { t: 'blk', k: 'LIM', a: '', l: 'Clamp output', p: [{ k: 'LO', v: '5 %' }, { k: 'IN', v: 'CV' }, { k: 'HI', v: '95 %' }] },
        { t: 'coil', k: 'OTE', a: 'LCV_EN', l: 'AO active' }
      ]
    },
    overrideRung: {
      note: 'The override: when level climbs into the protection band, the valve is pushed open regardless of the PID output. Written as a separate rung so the operator can see which is in charge:',
      ladder: {
        t: 'or',
        c: [
          { t: 'and', c: [ { t: 'no', a: 'OVR_HIGH', l: 'Override active' }, { t: 'blk', k: 'MOV', a: '', l: 'Force open', p: [{ k: 'SRC', v: '100 %' }, { k: 'DST', v: 'LCV_AO' }] } ] },
          { t: 'and', c: [ { t: 'nc', a: 'OVR_HIGH', l: 'Normal' }, { t: 'blk', k: 'MOV', a: '', l: 'PID output', p: [{ k: 'SRC', v: 'CV' }, { k: 'DST', v: 'LCV_AO' }] } ] }
        ]
      }
    },
    io: [
      { tag: 'SEP1_LV', type: 'AI', addr: 'AI:2.0:I', role: 'Separator 1 level, percent', initial: 55 },
      { tag: 'LIC_SP', type: 'REAL', addr: 'F8:0', role: 'Level setpoint', initial: 50 },
      { tag: 'LIC_101', type: 'PID', addr: 'PID control block', role: 'Controller instance (structure)', initial: 0 },
      { tag: 'LOOP_AUTO', type: 'BIT', addr: 'B3:6/0', role: 'Auto mode bit', initial: 1 },
      { tag: 'OVR_HIGH', type: 'BIT', addr: 'B3:6/1', role: 'Level override active', initial: 0 },
      { tag: 'LCV_AO', type: 'AO', addr: 'AO:0.0', role: 'Letdown valve position, percent', initial: 50 },
      { tag: 'LCV_EN', type: 'BIT', addr: 'B3:6/2', role: 'AO enabled / not in manual test', initial: 1 }
    ],
    readThisWay: [
      'The PID block does its calculation while its rung is true. If you let the enable bit go false you have just frozen the controller, not put it in manual - which is a different and worse state: the output holds and the integral stops tracking.',
      'The clamp (LO/HI) keeps the valve off its seats and off fully open so the positioner has authority left in both directions. Those numbers are the loop\'s practical travel limits, not a safety function.',
      'The override rung is an exclusive OR of two MOV paths - exactly one writes the AO each scan. Anything that lets two rungs write the same AO produces a valve that jitters between them.'
    ],
    defects: [
      'No tracking on the manual-to-auto transition: CV jumps from the manual value to whatever the stale integral says, and the valve steps. Set CV tracking before you enable.',
      'Anti-windup limits (integral clamp) left at the output clamp values, so the integral saturates and recovery takes minutes.',
      'Derivative on a level loop, because the block offered it. Level is noisy and integrating; derivative amplifies the noise into valve chatter.',
      'Override implemented as "PID setpoint changed" instead of a separate path - then the protection band is only as reliable as the operator not noticing the setpoint moved.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'PID', 'LIM', 'MOV', 'OTE'],
    note: 'PID member spelling (.Kc, .Ti, .Mode, .MAXI...) differs by controller family and firmware revision. The structure above is the concept; confirm the exact operands against the manual for your controller.'
  },

  {
    id: 'rung-purge',
    title: 'Purge-before-ignition sequence',
    category: 'Heater / burner',
    level: 'Advanced',
    oneLine: 'Time-sequenced permissives where the cost of getting it wrong is a furnace.',
    purpose: 'A direct-fired heater or reboiler must be purged with combustion air before fuel gas can be admitted, and must re-purge after any flame loss. Fuel gas valves are only proven open after the purge timer completes; flame failure closes them again.',
    boolean: 'PURGE_OK = TON(BLOWER_RUN, 300 s).DN ; FUEL_GAS_OPEN = PURGE_OK AND NOT FLAME_FAIL AND BLOWER_RUN ; flame loss clears PURGE_OK',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'BLOWER_RUN', l: 'FD fan running' },
        { t: 'nc', a: 'FLAME_FAIL', l: 'No flame fault' },
        { t: 'nc', a: 'FG_LOW_PS', l: 'Fuel gas pressure OK' },
        { t: 'blk', k: 'TON', a: 'T_PURGE', l: 'Purge timer', p: [{ k: 'PRE', v: '300 s' }, { k: 'DN', v: 'purge complete' }] },
        { t: 'coil', k: 'OTE', a: 'PURGE_OK', l: 'Purge done' }
      ]
    },
    fuelRung: {
      note: 'Fuel gas admission, gated on the purge result, with the pilot and main valves commanded in series with their proven-open feedbacks on the next rung:',
      ladder: {
        t: 'and',
        c: [
          { t: 'no', a: 'PURGE_OK', l: 'Purged' },
          { t: 'no', a: 'BURNER_ENABLE', l: 'Enable' },
          { t: 'nc', a: 'FLAME_FAIL', l: 'Flame OK' },
          { t: 'nc', a: 'HIGH_STACK_T', l: 'Temp OK' },
          { t: 'coil', k: 'OTE', a: 'FG_SAFETY_OPEN', l: 'Open FG trip valve' }
        ]
      }
    },
    io: [
      { tag: 'BLOWER_RUN', type: 'DI', addr: 'I:6.0', role: 'Forced-draft fan running (from MCC feedback)', initial: 1 },
      { tag: 'FLAME_FAIL', type: 'DI', addr: 'I:6.1', role: 'Flame scanner loss / ignition fault', initial: 0 },
      { tag: 'FG_LOW_PS', type: 'DI', addr: 'I:6.2', role: 'Fuel gas low supply pressure switch (NC = healthy)', initial: 0 },
      { tag: 'T_PURGE', type: 'TIMER', addr: 'T4:5', role: 'Purge on-delay', initial: 0 },
      { tag: 'PURGE_OK', type: 'BIT', addr: 'B3:7/0', role: 'Purge complete', initial: 0 },
      { tag: 'BURNER_ENABLE', type: 'DI', addr: 'I:6.3', role: 'Operator/burner master enable', initial: 1 },
      { tag: 'HIGH_STACK_T', type: 'DI', addr: 'I:6.4', role: 'High flue gas temperature switch', initial: 0 },
      { tag: 'FG_SAFETY_OPEN', type: 'DO', addr: 'O:4.0', role: 'Fuel gas safety trip valve (fail closed)', initial: 0 }
    ],
    readThisWay: [
      'The timer is deliberately in series with the fan running bit: any interruption of combustion air resets the purge accumulation, because a purged furnace is only purged if the air kept moving.',
      'FLAME_FAIL appears in BOTH rungs. It must stop the purge from being valid and it must close the fuel valve. Two places, one cause - that is intentional and should be documented as such.',
      'This pattern needs the proven-valve logic (ZSO/ZSC on the fuel trip valves) as an extra rung pair. A fuel gas valve that is commanded open and sits closed is an ignition failure; one commanded closed and sits open is an explosion. Both need detecting.'
    ],
    defects: [
      'Purge timer fed by a "fan commanded" bit instead of the fan running feedback.',
      'Re-purge omitted after a flame failure because the bit was cleared manually instead of by the flame fault itself.',
      'Fuel valve proven-closed feedback not wired, so an incomplete shutdown is invisible until someone looks at the flame.',
      'Doing burner management in a general-purpose PLC scan where the burner manufacturer\'s dedicated burner management system (BMS) was specified. Sequence-of-events and safety integrity differ, and the code of record usually requires the BMS logic.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'TON', 'OTE']
  },

  {
    id: 'rung-firstout',
    title: 'First-out capture on a unit trip',
    category: 'Diagnostics',
    level: 'Intermediate',
    oneLine: 'Twelve alarms fire at once. Which one was first?',
    purpose: 'When the unit trips, freeze the identity of the initiating cause so the shift can see it after the alarm list scrolls past. Implemented with a one-shot and a MOV into a reason-code register.',
    boolean: 'on rising edge of UNIT_TRIP: TRIP_REASON <- encode(active cause) ; TRIP_TIME <- now',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'UNIT_TRIP', l: 'Trip' },
        { t: 'blk', k: 'ONS', a: 'B3:8/7', l: 'Latch once', p: [] },
        { t: 'blk', k: 'MOV', a: '', l: 'Capture reason', p: [{ k: 'SRC', v: 'ACTIVE_CAUSE' }, { k: 'DST', v: 'TRIP_REASON' }] }
      ]
    },
    encodeRung: {
      note: 'The encoder that builds ACTIVE_CAUSE from the individual trip inputs - first-in wins because each rung only writes when nothing has been written yet:',
      ladder: {
        t: 'or',
        c: [
          { t: 'and', c: [ { t: 'nc', a: 'CAUSE_SET', l: 'Nothing yet' }, { t: 'no', a: 'PSL_TRIP', l: 'Low press' }, { t: 'blk', k: 'MOV', a: '', l: 'Reason = 1', p: [{ k: 'DST', v: 'ACTIVE_CAUSE' }, { k: 'SRC', v: '1' }] } ] },
          { t: 'and', c: [ { t: 'nc', a: 'CAUSE_SET', l: 'Nothing yet' }, { t: 'no', a: 'LSHH_TRIP', l: 'Hi level' }, { t: 'blk', k: 'MOV', a: '', l: 'Reason = 2', p: [{ k: 'DST', v: 'ACTIVE_CAUSE' }, { k: 'SRC', v: '2' }] } ] },
          { t: 'and', c: [ { t: 'nc', a: 'CAUSE_SET', l: 'Nothing yet' }, { t: 'no', a: 'VIB_TRIP', l: 'Vibration' }, { t: 'blk', k: 'MOV', a: '', l: 'Reason = 3', p: [{ k: 'DST', v: 'ACTIVE_CAUSE' }, { k: 'SRC', v: '3' }] } ] }
        ]
      }
    },
    io: [
      { tag: 'UNIT_TRIP', type: 'BIT', addr: 'B3:8/0', role: 'Unit trip asserted', initial: 0 },
      { tag: 'PSL_TRIP', type: 'DI', addr: 'I:7.0', role: 'Low suction pressure', initial: 1 },
      { tag: 'LSHH_TRIP', type: 'DI', addr: 'I:7.1', role: 'High-high separator level', initial: 0 },
      { tag: 'VIB_TRIP', type: 'DI', addr: 'I:7.2', role: 'Machinery vibration danger', initial: 0 },
      { tag: 'CAUSE_SET', type: 'BIT', addr: 'B3:8/1', role: 'A cause has been captured', initial: 0 },
      { tag: 'B3:8/7', type: 'BIT', addr: 'B3:8/7', role: 'One-shot storage for the capture (must be unique to that ONS)', initial: 0 },
      { tag: 'ACTIVE_CAUSE', type: 'INT', addr: 'N7:30', role: 'Live cause code', initial: 0 },
      { tag: 'TRIP_REASON', type: 'INT', addr: 'N7:31', role: 'Frozen first-out code', initial: 0 }
    ],
    readThisWay: [
      'Everything hinges on the ONS: the capture happens on the trip edge, once, and never again until the trip is cleared. Without it, TRIP_REASON just tracks whatever is active at read time.',
      'The encode branch uses "nothing yet" as a permissive in every path so the FIRST cause to appear wins, not the last. Order of the rungs is therefore significant - and that is a fact about scan order, not a style preference.',
      'The register is a code, not a string, and the HMI turns it into words from a lookup table. Then the PLC stays light and the wording can be changed without a download.'
    ],
    defects: [
      'First-out built without a reset path, so the panel reports the previous week\'s trip.',
      'Codes assigned ad hoc, so the list in the PLC and the list in the HMI help text disagree.',
      'Relying only on the DCS alarm list: alarms are time-stamped at annunciation, and a fast trip can produce a set that all carries the same second. Sequence-of-events (SOE) capture is the tool for that.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'ONS', 'MOV']
  },

  {
    id: 'rung-antisurge',
    title: 'Anti-surge: recycle valve on low flow approach',
    category: 'Machinery',
    level: 'Advanced',
    oneLine: 'Protecting the machine that protects the plant.',
    purpose: 'Detect approach to surge on a centrifugal stage from suction flow and head, and open the recycle valve. Deliberately written as ladder here to show the structure; in service this is normally done in a dedicated anti-surge controller with a hardwired trip path.',
    boolean: 'APPROACH = (FLOW_SUC < FLOW_MIN + margin) OR (HEAD_RATIO > limit) ; ASRV demand = max(PID_output, approach_boost)',
    ladder: {
      t: 'or',
      c: [
        { t: 'and', c: [
          { t: 'blk', k: 'LES', a: '', l: 'Flow below min', p: [{ k: 'Src A', v: 'FLOW_SUC' }, { k: 'Src B', v: 'FLOW_MIN + 5 %' }] },
          { t: 'no', a: 'MACHINE_RUNNING', l: 'Running' }
        ] },
        { t: 'and', c: [
          { t: 'blk', k: 'GRT', a: '', l: 'Head too high', p: [{ k: 'Src A', v: 'PD_DISC_SUC' }, { k: 'Src B', v: 'HEAD_MAX' }] },
          { t: 'no', a: 'MACHINE_RUNNING', l: 'Running' }
        ] },
        { t: 'no', a: 'ASRV_MANUAL_OPEN', l: 'Operator open' }
      ]
    },
    outputRung: {
      note: 'Demand to the valve, taking the larger of the normal control output and the surge boost, then slew-limited:',
      ladder: {
        t: 'and',
        c: [
          { t: 'no', a: 'ASRV_ENABLE', l: 'Enable' },
          { t: 'blk', k: 'SEL', a: '', l: 'Boost wins', p: [{ k: 'GATE', v: 'APPROACH' }, { k: 'TRUE', v: '100 %' }, { k: 'FALSE', v: 'ASRV_PID_CV' }, { k: 'DST', v: 'ASRV_DEMAND' }] },
          { t: 'coil', k: 'OTE', a: 'ASRV_AO', l: 'To positioner' }
        ]
      }
    },
    io: [
      { tag: 'FLOW_SUC', type: 'AI', addr: 'AI:3.0', role: 'Suction flow, actual m3/h or mass rate', initial: 9000 },
      { tag: 'FLOW_MIN', type: 'REAL', addr: 'F8:20', role: 'Surge-limit flow for current speed', initial: 9500 },
      { tag: 'PD_DISC_SUC', type: 'AI', addr: 'AI:3.1', role: 'Discharge minus suction pressure', initial: 120 },
      { tag: 'HEAD_MAX', type: 'REAL', addr: 'F8:21', role: 'Head limit at this flow', initial: 110 },
      { tag: 'MACHINE_RUNNING', type: 'DI', addr: 'I:8.0', role: 'Machine running permissive', initial: 1 },
      { tag: 'ASRV_AO', type: 'AO', addr: 'AO:1.0', role: 'Recycle valve position command', initial: 10 },
      { tag: 'ASRV_ENABLE', type: 'BIT', addr: 'B3:9/0', role: 'Anti-surge in service', initial: 1 },
      { tag: 'ASRV_MANUAL_OPEN', type: 'DI', addr: 'I:8.1', role: 'Operator force-open', initial: 0 }
    ],
    readThisWay: [
      'The OR structure is the point: low flow OR excessive head OR operator demand all cause the same protective action.',
      'SEL gives the boost absolute priority over the regulatory output - a min/max selector would be the other way around. Choose which is "the constraint" deliberately.',
      'A real anti-surge implementation needs a faster loop than the scan, valve-characterization by speed (the surge line moves), and usually a hardwired recycle-open on trip. This rung is the shape of the logic, not the whole protection function.'
    ],
    defects: [
      'Flow input with no density compensation: mass or standard-volume basis must be consistent with the surge map you drew the limit from.',
      'Sweep/bleed only from one stage when the machine has several - each stage needs its own limit.',
      'Anti-surge enable bit available to the operator without an alarm that says the machine is running unprotected.',
      'Trying to protect a machine from a 250 ms general-purpose scan and calling it good.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'LES', 'GRT', 'SEL', 'OTE']
  },

  {
    id: 'rung-esd-fg',
    title: 'F&G gas detection to ESD, de-energize to trip',
    category: 'Safety',
    level: 'Advanced',
    oneLine: 'The rung where broken wiring must cause a shutdown, not a silent defeat.',
    purpose: 'Two combustible gas detectors in the compressor bay, voting 1oo2 with a time delay, driving the shutdown valve solenoid so that loss of power, loss of detector, or the trip all close the valve.',
    boolean: 'GAS_TRIP = (GD_A > 30%LEL) OR (GD_B > 30%LEL) for 10 s ; SDV_HOLD = NOT GAS_TRIP AND NOT ANY_ESD AND HEALTHY ; SDV closes when SDV_HOLD goes false',
    ladder: {
      t: 'and',
      c: [
        { t: 'or', c: [
          { t: 'no', a: 'GD_A_ALM', l: 'A in alarm' },
          { t: 'no', a: 'GD_B_ALM', l: 'B in alarm' }
        ] },
        { t: 'blk', k: 'TON', a: 'T_FG', l: 'Confirm delay', p: [{ k: 'PRE', v: '10 s' }] },
        { t: 'nc', a: 'FG_BYPASS', l: 'Not bypassed' },
        { t: 'coil', k: 'OTE', a: 'GAS_TRIP', l: 'Trip asserted' }
      ]
    },
    solenoidRung: {
      note: 'The final element rung, written the other way round on purpose: it ENERGIZES to hold the valve open, so everything that can fail, fails to a shutdown:',
      ladder: {
        t: 'and',
        c: [
          { t: 'nc', a: 'GAS_TRIP', l: 'No gas trip' },
          { t: 'nc', a: 'ESD_1', l: 'No ESD-1' },
          { t: 'nc', a: 'GD_A_FAULT', l: 'A healthy' },
          { t: 'nc', a: 'GD_B_FAULT', l: 'B healthy' },
          { t: 'coil', k: 'OTE', a: 'SDV_HOLD', l: 'Energized = open' }
        ]
      }
    },
    io: [
      { tag: 'GD_A_ALM', type: 'DI', addr: 'I:9.0', role: 'Detector A alarm relay (30 % LEL)', initial: 0 },
      { tag: 'GD_B_ALM', type: 'DI', addr: 'I:9.1', role: 'Detector B alarm relay', initial: 0 },
      { tag: 'GD_A_FAULT', type: 'DI', addr: 'I:9.2', role: 'Detector A fault (open/short/expiry)', initial: 0 },
      { tag: 'GD_B_FAULT', type: 'DI', addr: 'I:9.3', role: 'Detector B fault', initial: 0 },
      { tag: 'T_FG', type: 'TIMER', addr: 'T4:9', role: 'Nuisance-trip delay', initial: 0 },
      { tag: 'FG_BYPASS', type: 'DI', addr: 'I:9.4', role: 'Permit-controlled bypass input', initial: 0 },
      { tag: 'GAS_TRIP', type: 'BIT', addr: 'B3:10/0', role: 'Gas trip asserted', initial: 0 },
      { tag: 'ESD_1', type: 'BIT', addr: 'B3:10/1', role: 'Level 1 ESD active', initial: 0 },
      { tag: 'SDV_HOLD', type: 'DO', addr: 'O:5.0', role: 'SDV solenoid - energized open, de-energized closed', initial: 1 }
    ],
    readThisWay: [
      'Detector ALARM bits are 1oo2 (either one trips) because detection sensitivity matters more here than spurious-trip avoidance; detector FAULT bits are separate and ALSO open the hold circuit. Fault and alarm are different conditions and must never be merged.',
      'The delay is only on the alarm path. Faults trip immediately, because a dead detector is already a loss of protection.',
      'The output rung is a chain of XIOs ending in an energized coil. Read it as "there is no reason to close" - that is exactly why a cut wire closes it.'
    ],
    defects: [
      'Energize-to-trip outputs: a broken wire means a failure to shut down. Inverted on purpose only where a spurious shutdown is worse than no shutdown, which is a documented decision, not a coding habit.',
      'Delay applied to the fault path so an open circuit is "debounced".',
      'Bypass input wired so that "bypass active" = a shutdown. That is right for a hardwired bypass switch but must be consistent in the logic, not mixed.',
      'Calibration expiry or sensor-age fault not treated as a fault - detectors drift and the alarm looks trustworthy.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'TON', 'OTE']
  },

  {
    id: 'rung-leadlag',
    title: 'Lead / lag pump swap on a running-hours basis',
    category: 'Utilities',
    level: 'Intermediate',
    oneLine: 'Wear the pair evenly, and hand over without dropping pressure.',
    purpose: 'Glycol (or amine, or seal gas booster) duty pumps: run one, standby the other, swap the lead position on a schedule or on demand, and start the standby before the lead stops where the service cannot tolerate a gap.',
    boolean: 'LEAD = LEAD_SEL ; RUN_A = LEAD==A AND DUTY_REQUEST ; RUN_B = (LEAD==B AND DUTY_REQUEST) OR (LEAD==A AND A_FAULT) ; swap when RUNHOURS_A - RUNHOURS_B > 720 h',
    ladder: {
      t: 'or',
      c: [
        { t: 'and', c: [
          { t: 'blk', k: 'EQU', a: '', l: 'Lead = A', p: [{ k: 'Src A', v: 'LEAD_SEL' }, { k: 'Src B', v: '1' }] },
          { t: 'no', a: 'DUTY_REQUEST', l: 'Demand' },
          { t: 'nc', a: 'PUMP_A_FAULT', l: 'A healthy' },
          { t: 'coil', k: 'OTE', a: 'PUMP_A_RUN', l: 'Run A' }
        ] },
        { t: 'and', c: [
          { t: 'blk', k: 'EQU', a: '', l: 'Lead = A', p: [{ k: 'Src A', v: 'LEAD_SEL' }, { k: 'Src B', v: '1' }] },
          { t: 'no', a: 'DUTY_REQUEST', l: 'Demand' },
          { t: 'no', a: 'PUMP_A_FAULT', l: 'A failed' },
          { t: 'coil', k: 'OTE', a: 'PUMP_B_RUN', l: 'Start B' }
        ] },
        { t: 'and', c: [
          { t: 'blk', k: 'EQU', a: '', l: 'Lead = B', p: [{ k: 'Src A', v: 'LEAD_SEL' }, { k: 'Src B', v: '2' }] },
          { t: 'no', a: 'DUTY_REQUEST', l: 'Demand' },
          { t: 'nc', a: 'PUMP_B_FAULT', l: 'B healthy' },
          { t: 'coil', k: 'OTE', a: 'PUMP_B_RUN', l: 'Run B' }
        ] }
      ]
    },
    swapRung: {
      note: 'Auto-swap when the accumulated difference passes a limit. Note the comparison on REAL run-hours, and that the swap is inhibited while demand is present unless you want a make-before-break transfer:',
      ladder: {
        t: 'and',
        c: [
          { t: 'blk', k: 'GRT', a: '', l: 'Hours apart', p: [{ k: 'Src A', v: 'RUNHRS_A' }, { k: 'Src B', v: 'RUNHRS_B + 720' }] },
          { t: 'nc', a: 'DUTY_REQUEST', l: 'Idle only' },
          { t: 'blk', k: 'MOV', a: '', l: 'Flip lead', p: [{ k: 'SRC', v: '2' }, { k: 'DST', v: 'LEAD_SEL' }] }
        ]
      }
    },
    io: [
      { tag: 'LEAD_SEL', type: 'INT', addr: 'N7:40', role: '1 = A lead, 2 = B lead', initial: 1 },
      { tag: 'DUTY_REQUEST', type: 'BIT', addr: 'B3:11/0', role: 'Header pressure low / auto-initiate demand', initial: 1 },
      { tag: 'PUMP_A_FAULT', type: 'DI', addr: 'I:10.0', role: 'MCC common trip A', initial: 0 },
      { tag: 'PUMP_B_FAULT', type: 'DI', addr: 'I:10.1', role: 'MCC common trip B', initial: 0 },
      { tag: 'PUMP_A_RUN', type: 'DO', addr: 'O:6.0', role: 'Start A', initial: 1 },
      { tag: 'PUMP_B_RUN', type: 'DO', addr: 'O:6.1', role: 'Start B', initial: 0 },
      { tag: 'RUNHRS_A', type: 'REAL', addr: 'F8:40', role: 'Accumulated from an RTO', initial: 2100 },
      { tag: 'RUNHRS_B', type: 'REAL', addr: 'F8:41', role: 'Accumulated from an RTO', initial: 1380 }
    ],
    readThisWay: [
      'Each branch tests three things: who is lead, is there demand, is that pump healthy. Any one missing and the coil is not energized.',
      'The failure-transfer branch is a single-pump-at-a-time design: B starts, A stops by the first branch going false. If the service cannot tolerate a gap, you need overlap and a delay before stopping the old pump.',
      'The swap only happens while idle here. On a duty-critical service, "auto-swap on demand" is often dropped entirely in favor of swapping at the next planned opportunity - that is a maintenance decision encoded in logic.'
    ],
    defects: [
      'Both pumps able to run at once when the fault and demand bits bounce together - check that the branches are mutually exclusive.',
      'Run-hours from a counter that was never reset at rebuild, so the swap decision is based on the machine\'s whole life rather than since last overhaul.',
      'No anti-short-cycle limit on the standby pump (minimum run time and minimum off time), so a flapping header pressure cycles both motors to death.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'EQU', 'GRT', 'MOV', 'OTE']
  },

  {
    id: 'rung-scaling',
    title: 'Scaling a 4-20 mA input and validating it',
    category: 'Data handling',
    level: 'Core',
    oneLine: 'Before any logic trusts a number, it should prove the number is possible.',
    purpose: 'Turn a raw analog input into engineering units, then reject it if the raw value is out of the live-zero band. A frozen or shorted transmitter is a common field fault and the logic should behave as if the measurement has left the building.',
    boolean: 'EU = EU_LO + (raw - RAW_LO)*(EU_HI-EU_LO)/(RAW_HI-RAW_LO) ; VALID = raw within [RAW_LO*0.95 .. RAW_HI*1.05]',
    ladder: {
      t: 'and',
      c: [
        { t: 'blk', k: 'CPT', a: '', l: 'Scale', p: [
          { k: 'DEST', v: 'PT_101_EU' },
          { k: 'EXPR', v: '400.0 + (RAW-6400)*(2800.0-400.0)/25600' },
          { k: 'note', v: 'EU_LO=400 kPa at 4 mA, EU_HI=2800 kPa at 20 mA, raw 6400..32000 (example card)' }
        ] }
      ]
    },
    validRung: {
      note: 'Validity check - two comparisons AND-ed, with the deadband generous enough that a healthy 4 mA reading does not fault:',
      ladder: {
        t: 'and',
        c: [
          { t: 'blk', k: 'GEQ', a: '', l: 'Above under-range', p: [{ k: 'Src A', v: 'RAW' }, { k: 'Src B', v: '6000' }] },
          { t: 'blk', k: 'LES', a: '', l: 'Below over-range', p: [{ k: 'Src A', v: 'RAW' }, { k: 'Src B', v: '32640' }] },
          { t: 'coil', k: 'OTE', a: 'PT_101_GOOD', l: 'Quality good' }
        ]
      }
    },
    io: [
      { tag: 'RAW', type: 'INT', addr: 'I:2.1:I', role: 'Raw counts from the AI card (example: 6400 at 4 mA, 32000 at 20 mA)', initial: 20000 },
      { tag: 'PT_101_EU', type: 'REAL', addr: 'F8:50', role: 'Engineering value, kPa', initial: 1600 },
      { tag: 'PT_101_GOOD', type: 'BIT', addr: 'B3:12/0', role: 'Data quality', initial: 1 }
    ],
    readThisWay: [
      'The raw endpoints belong to the CARD, not to the transmitter. 6400/32000 is one common convention (16-bit, 4-20 mA); others are 0-4095 or 0-27648 or -32768..32767. Look it up; do not carry a number over from the last plant.',
      'The quality bit is what makes the rest of the logic honest: a control loop should hold (not chase) and an alarm should go to a "bad PV" state, not read as a low-low trip.',
      'The formula is the same one IEC 61131-3 gives you as NORM_X then SCALE_X, and the same one SCL does in Logix. Writing it out once in a comment is worth it.'
    ],
    defects: [
      'Square-root extraction applied in the card and again in the program (flow), or in neither. Exactly once, in a named place.',
      'No quality check, so a shorted transmitter at 0 mA reads as "atmospheric" and the trip logic acts on it.',
      'Scaling constants hard-coded in five different rungs, then the range changes at a transmitter replacement.',
      'Filtering time left at zero on a flow measurement feeding a ratio controller, so the valve strokes with the noise.'
    ],
    status: 'illustrative-example',
    mnemonics: ['CPT', 'GEQ', 'LES', 'OTE']
  },

  {
    id: 'rung-seq-step',
    title: 'Step sequencer with advance, dwell, and interlock',
    category: 'Sequencing',
    level: 'Advanced',
    oneLine: 'How a startup sequence is actually written when you cannot hand every decision to an operator.',
    purpose: 'A generic step machine: advance on condition + dwell, hold on any interlock loss, jump to a fault step on trip. The pattern used for plant startup, shutdown, chemical tank changeover, and regeneration bed switching.',
    boolean: 'STEP advances when STEP_OK[n] and T_DWELL.DN ; STEP jumps to 90 on TRIP ; STEP resets to 0 on reset with no trip',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'SEQ_ENABLE', l: 'Enabled' },
        { t: 'nc', a: 'SEQ_TRIP', l: 'No trip' },
        { t: 'blk', k: 'GRT', a: '', l: 'Step done?', p: [{ k: 'Src A', v: 'STEP_OK' }, { k: 'Src B', v: '0' }] },
        { t: 'blk', k: 'TON', a: 'T_DWELL', l: 'Dwell', p: [{ k: 'PRE', v: '15 s' }] },
        { t: 'blk', k: 'ONS', a: 'B3:13/7', l: 'Advance once', p: [] },
        { t: 'blk', k: 'MOV', a: '', l: 'Step + 1', p: [{ k: 'SRC', v: 'STEP + 1' }, { k: 'DST', v: 'STEP' }] }
      ]
    },
    tripRung: {
      note: 'Fault path takes priority over the increment - so it sits in the same file, executed after the advance rung, and writes the step directly:',
      ladder: {
        t: 'and',
        c: [
          { t: 'no', a: 'SEQ_TRIP', l: 'Trip' },
          { t: 'blk', k: 'MOV', a: '', l: 'Step = 90', p: [{ k: 'SRC', v: '90' }, { k: 'DST', v: 'STEP' }] }
        ]
      }
    },
    io: [
      { tag: 'SEQ_ENABLE', type: 'DI', addr: 'I:11.0', role: 'Sequence in service', initial: 1 },
      { tag: 'SEQ_TRIP', type: 'BIT', addr: 'B3:13/0', role: 'Any interlock violation', initial: 0 },
      { tag: 'STEP', type: 'INT', addr: 'N7:50', role: 'Current step, 10..80, 90 = fault', initial: 20 },
      { tag: 'STEP_OK', type: 'INT', addr: 'N7:51', role: 'Condition for the current step satisfied (written by per-step rungs)', initial: 1 },
      { tag: 'T_DWELL', type: 'TIMER', addr: 'T4:12', role: 'Minimum time in each step', initial: 0 },
      { tag: 'B3:13/7', type: 'BIT', addr: 'B3:13/7', role: 'Advance one-shot bit', initial: 0 }
    ],
    readThisWay: [
      'The whole machine is five elements and one integer. Readability comes from the discipline, not the complexity: one rung advances, per-step rungs set STEP_OK, one rung handles the fault, output rungs test STEP = n.',
      'The ONS before the MOV is what stops the step counter racing through every step in one second while the dwell timer holds true.',
      'Writing 90 from a later rung means the fault wins for that scan regardless of the increment. If you invert that order, a trip during an advance gets overwritten - a bug that only shows up on the worst day.',
      'Outputs are driven by comparisons against STEP, so a step number means the same thing on the HMI, in the sequence table, and in the documentation.'
    ],
    defects: [
      'No dwell/minimum-time, so valves are commanded faster than they can stroke and the sequence runs ahead of the plant.',
      'Steps numbered with gaps skipped, so a future insert renumbers everything and breaks the HMI mapping.',
      'Advancing on a command bit rather than on proven position - the sequence leaves step 30 believing the valve opened.',
      'No documented safe state for a mid-sequence trip: which of the four valves the sequence opened should stay open when it stops?'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'GRT', 'TON', 'ONS', 'MOV']
  }
];
