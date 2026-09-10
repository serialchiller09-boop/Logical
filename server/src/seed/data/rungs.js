/**
 * EXAMPLE RUNGS - gas plant service.
 *
 * Every rung is authored here as a runnable structure, not a picture:
 *   - the UI renders it as an SVG ladder diagram
 *   - the UI can also SIMULATE it (toggle inputs, step the scan, watch timers/counters)
 * so what you see drawn and what you can test are the same object.
 *
 * Node grammar (see web/src/lib/ladder.js for the evaluator):
 *   { t:'and', c:[...] }  series (logical AND)
 *   { t:'or',  c:[...] }  parallel branches (logical OR)
 *   { t:'no',  a, l }     XIC  - true when bit a == 1
 *   { t:'nc',  a, l }     XIO  - true when bit a == 0
 *   { t:'short' }         always-true path
 *   { t:'coil', k, a, l } k = OTE | OTL | OTU
 *   { t:'blk',  k, a, l, p } k = TON | TOF | RTO | RES | CTU | CTD | GEQ | LES | GRT | EQU | MOV | ONS | SEL | LIM | PID | MSG ; p = [{k,v}]
 *
 * These are TEACHING examples. Tag names are invented for illustration; the numbers
 * (presets, limits, deadbands) are placeholders. None of it is a design value.
 */
export const RUNGS = [
  {
    id: 'rung-seal-in',
    title: 'Motor seal-in with permissive chain',
    category: 'Start / stop',
    level: 'Core',
    oneLine: 'The pattern behind almost every pump, blower and compressor start in the plant.',
    purpose: 'Start the lube oil pump from the HMI or remote, hold it running through its own holding contact, and drop it out on any permissive loss or stop command.',
    boolean: 'LOP_RUN = LUBE_PS_OK AND NOT STOP AND NOT COMMON_TRIP AND NOT LOCAL_AND_NOT_AUTO AND (START_CMD OR LOP_RUN)',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'LUBE_PS_OK', l: 'Lube pressure OK' },
        { t: 'or', c: [
          { t: 'and', c: [
            { t: 'no', a: 'AUTO_MODE', l: 'Auto' },
            { t: 'no', a: 'HMI_START', l: 'Start' }
          ] },
          { t: 'and', c: [
            { t: 'no', a: 'REMOTE_START', l: 'Remote' },
            { t: 'no', a: 'AUTO_MODE', l: 'Manual' }
          ] },
          { t: 'no', a: 'LOP_RUN', l: 'Seal-in' }
        ] },
        { t: 'nc', a: 'HMI_STOP', l: 'Stop' },
        { t: 'nc', a: 'COMMON_TRIP', l: 'CPT' },
        { t: 'nc', a: 'MCC_LOCAL', l: 'Not local' },
        { t: 'coil', k: 'OTE', a: 'LOP_RUN', l: 'Pump contactor' }
      ]
    },
    io: [
      { tag: 'LUBE_PS_OK', type: 'DI', addr: 'I:0.0', role: 'Pressure switch, closed at good pressure. Healthy = 1.', initial: 1 },
      { tag: 'AUTO_MODE', type: 'DI', addr: 'I:0.1', role: 'Handswitch in AUTO', initial: 1 },
      { tag: 'HMI_START', type: 'DI', addr: 'I:0.2', role: 'Operator start request (momentary)', initial: 0 },
      { tag: 'REMOTE_START', type: 'DI', addr: 'I:0.3', role: 'Start from upstream sequence', initial: 0 },
      { tag: 'HMI_STOP', type: 'DI', addr: 'I:0.4', role: 'Stop request. NC wiring means healthy = 1, so the rung uses an XIO on the raw bit: here the input card already inverts, so this is shown as an explicit stop bit.', initial: 0 },
      { tag: 'COMMON_TRIP', type: 'DI', addr: 'I:0.5', role: 'MCC common trip (0 = breaker/fault)', initial: 0 },
      { tag: 'MCC_LOCAL', type: 'DI', addr: 'I:0.6', role: 'Local/remote - auto logic must be inhibited in LOCAL', initial: 0 },
      { tag: 'LOP_RUN', type: 'DO', addr: 'O:0.0', role: 'Contoractor coil + feedback reference', initial: 0 }
    ],
    readThisWay: [
      'Left to right: every element must conduct for the coil to energize.',
      'The parallel block is the OR: any one of the three paths (permissive-hold, auto start, remote start, or the seal-in) closes the path.',
      'The seal-in branch is the pump\'s own run bit - it replaces the momentary start button after one scan.',
      'Anything in SERIES after that block (stop, CPT, not-local) is an AND-NOT: one false opens the whole path and the coil drops out.'
    ],
    defects: [
      'Forgetting the LOCAL/REMOTE inhibit: the PLC keeps claiming it started a pump the operator has in hand.',
      'Sealing in the OUTPUT bit instead of the RUN FEEDBACK bit, so "we commanded it" is mistaken for "it is running". With a failed Contactor coil you get a run indication and no pump.',
      'Putting the stop in parallel instead of in series - that makes stop optional.'
    ],
    status: 'illustrative-example',
    note: 'No setpoints appear in this rung because none are needed to explain it. The tags are invented; in a real version the permissive set and any delay come from your cause-and-effect matrix and motor-protection settings, not from this page.',
    mnemonics: ['XIC', 'XIO', 'OTE']
  },

  {
    id: 'rung-latch-ack',
    title: 'Trip latch with acknowledge (OTL / OTU)',
    category: 'Alarms / trips',
    level: 'Core',
    oneLine: 'Remember what tripped, and let a human decide when it is forgotten.',
    purpose: 'Latched low-suction-pressure trip: the trip bit must survive the pressure recovering, so the operator is told what happened and has to acknowledge before a restart is possible.',
    boolean: 'LSP_TRIP = SET(LSP_PSL) ; LSP_TRIP = RESET(ACK AND NOT LSP_PSL)',
    ladder: {
      t: 'or',
      c: [
        { t: 'and', c: [ { t: 'no', a: 'LSP_PSL', l: 'PSL closed = low' }, { t: 'coil', k: 'OTL', a: 'TRIP_LAT', l: 'Latch trip' } ] },
        { t: 'and', c: [ { t: 'no', a: 'ACK_BTN', l: 'Ack' }, { t: 'nc', a: 'LSP_PSL', l: 'Cause clear' }, { t: 'coil', k: 'OTU', a: 'TRIP_LAT', l: 'Unlatch' } ] }
      ]
    },
    followOn: {
      note: 'The latch then drives the real action in a separate rung, so the memory and the output are decoupled:',
      ladder: {
        t: 'and',
        c: [
          { t: 'nc', a: 'TRIP_LAT', l: 'No trip' },
          { t: 'nc', a: 'MAINT_BYPASS', l: 'Not bypassed' },
          { t: 'coil', k: 'OTE', a: 'SDV_OPEN', l: 'Hold SDV open' }
        ]
      },
      io: [
        { tag: 'TRIP_LAT', type: 'BIT', addr: 'B3:0/0', role: 'Latched trip memory', initial: 0 },
        { tag: 'MAINT_BYPASS', type: 'DI', addr: 'I:0.7', role: 'Bypass - energized in maintenance', initial: 0 },
        { tag: 'SDV_OPEN', type: 'DO', addr: 'O:0.1', role: 'SDV hold-open solenoid (de-energize to close)', initial: 0 }
      ]
    },
    io: [
      { tag: 'LSP_PSL', type: 'DI', addr: 'I:1.0', role: 'Pressure switch low. NC device: reads 1 healthy, 0 on low pressure.', initial: 1 },
      { tag: 'ACK_BTN', type: 'DI', addr: 'I:1.1', role: 'Operator acknowledge', initial: 0 },
      { tag: 'TRIP_LAT', type: 'BIT', addr: 'B3:0/0', role: 'Latched trip', initial: 0 }
    ],
    readThisWay: [
      'Two rungs, one bit: the set rung only sets, the reset rung only resets. Neither is an OTE.',
      'The reset requires BOTH the acknowledge AND that the cause is gone. Acknowledge alone is not enough - otherwise you clear the memory and hide a live trip.',
      'Because the trip is normally-closed in health, "PSL reads 0" is the fault: the latch rung reads XIC on the INVERTED condition, so the diagram shows LSP_PSL as the low-detected bit.'
    ],
    defects: [
      'Latching with an OTE on a self-holding branch instead: works, but then a scan-order change can silently break it.',
      'Acknowledge without "cause cleared" interlock - the standard way to lose the memory of an unresolved problem.',
      'No bypass supervision: maintenance isolates the switch and the HMI still says "protected".'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'OTL', 'OTU']
  },

  {
    id: 'rung-2oo3',
    title: '2oo3 voting for a level trip',
    category: 'Safety voting',
    level: 'Intermediate',
    oneLine: 'Two of three transmitters must agree before you shut the plant down - and you must know when the vote is degraded.',
    purpose: 'High-high level on a production separator measured three ways. Trip only on agreement of any two, so one drifting transmitter cannot shut in the facility; annunciate when only two sensors remain in service so the redundancy is not silently gone.',
    boolean: 'TRIP_VOTE = (A AND B) OR (A AND C) OR (B AND C) OR (TEST_MODE AND A AND B AND C)',
    ladder: {
      t: 'and',
      c: [
        { t: 'or', c: [
          { t: 'and', c: [ { t: 'no', a: 'LSHH_A', l: 'A' }, { t: 'no', a: 'LSHH_B', l: 'B' } ] },
          { t: 'and', c: [ { t: 'no', a: 'LSHH_A', l: 'A' }, { t: 'no', a: 'LSHH_C', l: 'C' } ] },
          { t: 'and', c: [ { t: 'no', a: 'LSHH_B', l: 'B' }, { t: 'no', a: 'LSHH_C', l: 'C' } ] },
          { t: 'and', c: [
            { t: 'no', a: 'TEST_MODE', l: 'SIT' },
            { t: 'no', a: 'LSHH_A', l: 'A' },
            { t: 'no', a: 'LSHH_B', l: 'B' },
            { t: 'no', a: 'LSHH_C', l: 'C' }
          ] }
        ] },
        { t: 'coil', k: 'OTE', a: 'TRIP_VOTE', l: 'Voted trip' }
      ]
    },
    outputRung: {
      note: 'A separate rung writes the output, so the vote result is available for annunciation and SOE as well as the trip:',
      ladder: {
        t: 'and',
        c: [
          { t: 'nc', a: 'TRIP_VOTE', l: 'Vote' },
          { t: 'nc', a: 'BYPASS_ACTIVE', l: 'Not bypassed' },
          { t: 'coil', k: 'OTE', a: 'SDV_CLOSE_DO', l: 'Close SDV' }
        ]
      }
    },
    io: [
      { tag: 'LSHH_A', type: 'DI', addr: 'I:2.0', role: 'Separator level switch, high-high, transmitter A', initial: 0 },
      { tag: 'LSHH_B', type: 'DI', addr: 'I:2.1', role: 'Transmitter B', initial: 0 },
      { tag: 'LSHH_C', type: 'DI', addr: 'I:2.2', role: 'Transmitter C', initial: 0 },
      { tag: 'TEST_MODE', type: 'DI', addr: 'I:2.3', role: 'Proof-test / bypass permit input', initial: 0 },
      { tag: 'TRIP_VOTE', type: 'BIT', addr: 'B3:1/0', role: 'Voted trip', initial: 0 },
      { tag: 'BYPASS_ACTIVE', type: 'BIT', addr: 'B3:1/1', role: 'Any input in bypass', initial: 0 },
      { tag: 'SDV_CLOSE_DO', type: 'DO', addr: 'O:1.0', role: 'SDV solenoid, de-energize to close', initial: 0 }
    ],
    readThisWay: [
      'Three pairs across the branch = the three possible majorities; the OTE at the end writes the vote so the same bit can annunciate and trip.',
      'The fourth path is the deliberate exception: during a witnessed proof test you may want to see a 3oo3 result. It is written in as a mode, not embedded in each pair.',
      'The trip bit and the output write are separate so the HMI can show the cause, and so a bypass cannot hide the vote.'
    ],
    defects: [
      'Voting three inputs that share one transmitter or one impulse line: they are not independent and the whole architecture assumption is void.',
      'No "degraded mode" annunciation. With 2oo3 and one failed sensor you are running 1oo2 sensitivity - the operators need to know.',
      'Bypassing the vote instead of the input, so the bypass survives the end of the test.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'OTE']
  },

  {
    id: 'rung-ton-lockout',
    title: 'Restart lockout after a trip (TON)',
    category: 'Timers',
    level: 'Core',
    oneLine: 'Do not let a machine cycle itself to destruction while the cause is still clearing.',
    purpose: 'After any trip, block re-initiation for a fixed period so the separator can drain, the anti-surge can settle, and the operator can actually look at it. Timer resets when the trip clears, so the delay always starts at the moment of the trip.',
    boolean: 'RESTART_BLOCK = TRIP_LAT AND NOT TON(TRIP_LAT, PRE=120s).DN ; auto-initiate inhibited while the delay is still running',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'TRIP_LAT', l: 'Any trip latched' },
        { t: 'blk', k: 'TON', a: 'T_LOCK', l: 'Lockout timer', p: [{ k: 'PRE', v: '120 s' }, { k: 'ACC', v: 'accum' }, { k: 'DN', v: 'delay elapsed' }] }
      ]
    },
    blockRung: {
      note: 'A second rung uses the timer bit. The split is not decoration: an in-series TON only passes power once .DN is set, so the inhibit has to be written from an XIO on .DN, not taken off the timer contact itself:',
      ladder: {
        t: 'and',
        c: [
          { t: 'no', a: 'TRIP_LAT', l: 'Trip still latched' },
          { t: 'nc', a: 'T_LOCK.DN', l: 'Delay not elapsed' },
          { t: 'coil', k: 'OTE', a: 'RESTART_BLOCK', l: 'Block auto-start' }
        ]
      }
    },
    io: [
      { tag: 'TRIP_LAT', type: 'BIT', addr: 'B3:2/0', role: 'Unit trip latched', initial: 0 },
      { tag: 'T_LOCK', type: 'TIMER', addr: 'T4:0', role: 'On-delay timer; PRE in ms on Logix/SLC (120 s = 120000). .DN is read by the XIO on the rung.', initial: 0 },
      { tag: 'RESTART_BLOCK', type: 'BIT', addr: 'B3:2/1', role: 'Inhibited-for-restart', initial: 0 }
    ],
    readThisWay: [
      'The TON sits in series and an XIO on .DN follows it: the lockout is asserted from the moment of the trip and releases when the delay completes. Driving the coil straight off the timer would do the opposite - it would allow restart during the lockout and block it afterwards.',
      'While TRIP_LAT is true the timer keeps accumulating; when the trip clears, TON loses enable and .ACC returns to zero (a TON is non-retentive) - so the next trip starts the full delay again.',
      'Preset unit: on Logix/SLC a TON preset is in MILLISECONDS, so 120 s is typed 120000. That single mismatch is the most common timer bug in existence.'
    ],
    defects: [
      'Using a TON where you meant a TOF: this pattern is "delay the restart", not "hold the output after the input drops".',
      'Placing a RES before the timer in the same scan and wondering why it never reaches preset.',
      'Forgetting that lockout must be bypassable for a witnessed first start after commissioning - and documenting who may bypass it.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'TON', 'OTE']
  },

  {
    id: 'rung-tof-cooldown',
    title: 'Aftercooler fan run-on (TOF)',
    category: 'Timers',
    level: 'Core',
    oneLine: 'The opposite job: keep something running a while after the process asks it to stop.',
    purpose: 'Keep the compressor aftercooler fan running after the machine unloads, so trapped hot gas is actually cooled instead of cooking the core; then let it stop by itself.',
    boolean: 'FAN_RUN = TOF(LOADED).Q',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'MOTOR_RUNNING', l: 'Machine loaded' },
        { t: 'blk', k: 'TOF', a: 'T_COOL', l: 'Run-on timer', p: [{ k: 'PRE', v: '300 s' }, { k: 'DN', v: 'fan commanded' }] },
        { t: 'nc', a: 'FAN_COMMON_TRIP', l: 'Fan healthy' },
        { t: 'coil', k: 'OTE', a: 'FAN_RUN', l: 'Fan contactor' }
      ]
    },
    io: [
      { tag: 'MOTOR_RUNNING', type: 'DI', addr: 'I:3.0', role: 'Compressor running / loaded', initial: 1 },
      { tag: 'T_COOL', type: 'TIMER', addr: 'T4:1', role: 'Off-delay timer', initial: 0 },
      { tag: 'FAN_COMMON_TRIP', type: 'DI', addr: 'I:3.1', role: 'Fan breaker/fault', initial: 0 },
      { tag: 'FAN_RUN', type: 'DO', addr: 'O:2.0', role: 'Aftercooler fan starter', initial: 0 }
    ],
    readThisWay: [
      'TOF: done bit is TRUE while the rung is energized AND for the preset after it goes false. So the fan keeps running through the delay without you timing anything explicitly.',
      'The trip contact is placed AFTER the timer, so a fault on the fan drops the output immediately - the delay never overrides a real protection input.',
      'Position matters: put that same contact before the timer and a fan fault would still leave the timer "done" and the HMI showing a fan that is off.'
    ],
    defects: [
      'Running a TOF off a latched trip bit you forgot to unlatch, so the fan runs until the next shift.',
      'Assuming a TOF can be reset with RES the way a TON can - the interaction is confusing on legacy platforms; clear the enable instead.',
      'Long run-on with no low-ambient logic: in winter the core freezes or the fan hunts with the louver control.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'TOF', 'OTE']
  },

  {
    id: 'rung-ctu-strokes',
    title: 'Chemical injection: strokes against target',
    category: 'Counters',
    level: 'Core',
    oneLine: 'Metering by pump stroke, with an edge detector doing the honest work.',
    purpose: 'Count injection pump strokes and compare against the batch target, resetting at the start of each batch. Doubles as a "did it actually stroke?" check against the flow-proportional demand.',
    boolean: 'STROKE_CNT increments on rising edge of PUMP_SS ; DONE when STROKE_CNT >= TARGET ; RES on BATCH_START',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'PUMP_SS', l: 'Stroke switch' },
        { t: 'blk', k: 'ONS', a: 'B3:3/7', l: 'One shot', p: [] },
        { t: 'blk', k: 'CTU', a: 'C5:0', l: 'Stroke counter', p: [{ k: 'PRE', v: 'TARGET' }, { k: 'ACC', v: 'strokes' }, { k: 'DN', v: 'batch done' }] },
        { t: 'coil', k: 'OTE', a: 'BATCH_DONE', l: 'Target reached' }
      ]
    },
    resetRung: {
      note: 'Reset rung, kept separate and labeled:',
      ladder: {
        t: 'and',
        c: [ { t: 'no', a: 'BATCH_START', l: 'New batch' }, { t: 'blk', k: 'RES', a: 'C5:0', l: 'Reset counter', p: [] } ]
      }
    },
    io: [
      { tag: 'PUMP_SS', type: 'DI', addr: 'I:4.0', role: 'Stroke switch / proximity on the pump', initial: 0 },
      { tag: 'B3:3/7', type: 'BIT', addr: 'B3:3/7', role: 'One-shot internal bit (must be unique to this instruction)', initial: 0 },
      { tag: 'C5:0', type: 'COUNTER', addr: 'C5:0', role: 'Stroke counter (ACC retentive on legacy platforms)', initial: 0 },
      { tag: 'TARGET', type: 'INT', addr: 'N7:10', role: 'Batch target, strokes', initial: 150 },
      { tag: 'BATCH_START', type: 'DI', addr: 'I:4.1', role: 'Operator batch start', initial: 0 },
      { tag: 'BATCH_DONE', type: 'BIT', addr: 'B3:3/0', role: 'Target reached', initial: 0 }
    ],
    readThisWay: [
      'CTU counts false-to-true transitions of its rung - so the ONS ahead of it is what makes the count mean "one stroke" instead of "one scan while the switch was closed".',
      'The counter\'s .ACC is retentive on legacy platforms, which is why the RES rung is part of the pattern and not an optional extra.',
      'The reset rung sits after the counted element. If it ran before, you would reset the count you had just made in that same scan.'
    ],
    defects: [
      'Counting scan-time instead of edges: a 3-second stroke at a 20 ms scan adds 150 counts.',
      'One shared ONS bit used by two one-shots - the second one never fires.',
      'Target as a constant typed into the .PRE, so the operator cannot change it, so it gets bypassed, so nothing meters anymore.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'ONS', 'CTU', 'RES', 'OTE']
  },

  {
    id: 'rung-alarm-deadbnd',
    title: 'Alarm with deadband and on-delay (no chatter)',
    category: 'Analog limits',
    level: 'Intermediate',
    oneLine: 'High level should alarm once, not 40 times a minute.',
    purpose: 'High-high alarm on a separator level PV with hysteresis and a delay, so noise near the limit does not flood the alarm list but a genuine excursion still trips in the intended time.',
    boolean: 'ALARM_SET when LV > HH_LIMIT for > 5 s ; ALARM_RESET when LV < (HH_LIMIT - 0.5%)',
    ladder: {
      t: 'and',
      c: [
        { t: 'blk', k: 'GRT', a: '', l: 'LV > HH', p: [{ k: 'Src A', v: 'LEVEL_PV' }, { k: 'Src B', v: '100.0 %' }] },
        { t: 'blk', k: 'TON', a: 'T_ALARM', l: 'On-delay', p: [{ k: 'PRE', v: '5 s' }] },
        { t: 'coil', k: 'OTL', a: 'LSHH_ALM', l: 'Alarm' }
      ]
    },
    clearRung: {
      note: 'Reset side, using the lower (hysteresis) limit so the alarm cannot re-fire immediately:',
      ladder: {
        t: 'and',
        c: [
          { t: 'blk', k: 'LES', a: '', l: 'LV < HH - deadband', p: [{ k: 'Src A', v: 'LEVEL_PV' }, { k: 'Src B', v: '99.5 %' }] },
          { t: 'coil', k: 'OTU', a: 'LSHH_ALM', l: 'Clear' }
        ]
      }
    },
    io: [
      { tag: 'LEVEL_PV', type: 'AI', addr: 'I:2.0 (AI)', role: 'Separator level, engineering units', initial: 99.8 },
      { tag: 'LSHH_ALM', type: 'BIT', addr: 'B3:4/0', role: 'Annunciation bit to HMI', initial: 0 },
      { tag: 'T_ALARM', type: 'TIMER', addr: 'T4:1', role: 'On-delay before the alarm annunciates; the preset belongs in your alarm philosophy, not here', initial: 0 }
    ],
    readThisWay: [
      'Set on one limit, clear on a lower one. That gap is the deadband, and it is what stops the alarm from toggling while the PV sits on the limit.',
      'The TON in series means a spike shorter than the delay never latches anything. Note the delay is a deliberate risk decision, not a tidiness preference.',
      'On a modern platform this whole pattern is one analog-alarm instruction with the deadband and delay as parameters - which is why you should still be able to read it written out.'
    ],
    defects: [
      'Deadband set by trial and error until the alarm stops bothering people - then the alarm no longer means anything.',
      'The clear limit above the set limit (inverted sign on a negative-going alarm): the alarm never clears, or clears at the wrong time.',
      'Delay on a protective trip borrowed from an annunciation, because it was convenient.'
    ],
    status: 'illustrative-example',
    mnemonics: ['GRT', 'LES', 'TON', 'OTL', 'OTU']
  },

  {
    id: 'rung-jt-permissive',
    title: 'J-T valve open permissive with proven position',
    category: 'Gas plant sequence',
    level: 'Intermediate',
    oneLine: 'Cold-section isolation: open the cryogenic path only when the rest of the plant can take it.',
    purpose: 'Permissive chain before a J-T (Joule-Thomson) letdown valve is allowed to open: dehydration in service, no high level in the low-temperature separator, downstream pressure established, no ESD active. Then verify the valve actually proved open before the sequence advances.',
    boolean: 'JT_OPEN_CMD = DEHY_OK AND NOT LTLSHH AND DP_DOWN_OK AND NOT ESD_ACTIVE AND NOT BYPASS ; JT_PROVEN = ZSO ; advance only on JT_PROVEN after a timeout alarm',
    ladder: {
      t: 'and',
      c: [
        { t: 'no', a: 'SEQ_RUNNING', l: 'Sequence active' },
        { t: 'no', a: 'TEG_IN_SERVICE', l: 'Dehydration' },
        { t: 'no', a: 'MS_IN_SERVICE', l: 'Sieve (if fed)' },
        { t: 'nc', a: 'LTLSHH', l: 'No HH level' },
        { t: 'nc', a: 'ESD_ACTIVE', l: 'No ESD' },
        { t: 'or', c: [
          { t: 'no', a: 'JT_OPEN_CMD', l: 'Already commanded' },
          { t: 'no', a: 'SEQ_AT_STEP20', l: 'At step 20' }
        ] },
        { t: 'coil', k: 'OTE', a: 'JT_OPEN_CMD', l: 'Open JT XV' }
      ]
    },
    proveRung: {
      note: 'Proven-open supervision - a request is not a position:',
      ladder: {
        t: 'and',
        c: [
          { t: 'no', a: 'JT_OPEN_CMD', l: 'Commanded' },
          { t: 'nc', a: 'JT_ZSO', l: 'Not proven' },
          { t: 'blk', k: 'TON', a: 'T_JTTIME', l: 'Stroke time', p: [{ k: 'PRE', v: '10 s' }] },
          { t: 'coil', k: 'OTL', a: 'JT_FAIL_OPEN', l: 'Valve failed to open' }
        ]
      }
    },
    io: [
      { tag: 'TEG_IN_SERVICE', type: 'DI', addr: 'I:5.0', role: 'Dehydration train available (dew point OK)', initial: 1 },
      { tag: 'MS_IN_SERVICE', type: 'DI', addr: 'I:5.1', role: 'Molecular sieve in service', initial: 1 },
      { tag: 'LTLSHH', type: 'DI', addr: 'I:5.2', role: 'Low-temp separator high-high level switch', initial: 0 },
      { tag: 'ESD_ACTIVE', type: 'DI', addr: 'I:5.3', role: 'Any ESD level active', initial: 0 },
      { tag: 'SEQ_AT_STEP20', type: 'BIT', addr: 'B3:2/5', role: 'Set when STEP = 20 by a comparison rung', initial: 1 },
      { tag: 'JT_OPEN_CMD', type: 'DO', addr: 'O:3.0', role: 'Solenoid to J-T on-off valve', initial: 0 },
      { tag: 'JT_ZSO', type: 'DI', addr: 'I:5.4', role: 'Valve proven open (limit switch)', initial: 0 },
      { tag: 'JT_FAIL_OPEN', type: 'BIT', addr: 'B3:5/0', role: 'Failed-to-position alarm', initial: 0 },
      { tag: 'SEQ_RUNNING', type: 'BIT', addr: 'B3:5/1', role: 'Startup sequence is actively stepping', initial: 1 },
      { tag: 'T_JTTIME', type: 'TIMER', addr: 'T4:2', role: 'Stroke-time supervision timer; the preset must come from the valve/actuator datasheet at YOUR supply pressure', initial: 0 }
    ],
    readThisWay: [
      'All the safety conditions are series XIC/XIO: they are AND-ed, and any of them opening stops the command.',
      'The OR branch is a hold path - it keeps the command alive once issued even if the sequence step moves on.',
      'The second rung is the important one: it times the gap between "commanded" and "proven" and latches a failure. That is how you catch a valve that is air-bound, iced, or has a failed pilot.'
    ],
    defects: [
      'Advancing the sequence on the output bit instead of the proven position - the plant then continues with a closed J-T valve and the cold box never cools, which looks like a refrigeration problem for hours.',
      'Stroke timeout set from a datasheet at 20 psi air on a valve that is being fed at 60 psi in summer and 40 in winter.',
      'Missing "no level in the low-temp separator" from the permissive chain. That is exactly the case the permissive exists for.'
    ],
    status: 'illustrative-example',
    mnemonics: ['XIC', 'XIO', 'OTE', 'TON', 'OTL']
  }
];
