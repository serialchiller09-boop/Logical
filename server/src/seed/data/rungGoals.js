/**
 * Short, action-first copy for the ladder lab.
 * Kept separate from the long teaching prose on each rung so the UI can
 * lead with a goal without rewriting every purpose paragraph.
 */
export const RUNG_GOALS = {
  'rung-seal-in': {
    goal: 'Start the pump, release Start — it should keep running until you stop it.',
    tryThis: [
      'Turn HMI_START on → Step scan → turn Start off → Step again (pump stays on).',
      'Flip HMI_STOP or COMMON_TRIP → Step (pump drops out).'
    ]
  },
  'rung-latch-ack': {
    goal: 'Trip sticks after the cause clears — only Ack + clear cause resets it.',
    tryThis: [
      'Set LSP_PSL to trip → Step (TRIP_LAT latches).',
      'Clear the cause, press ACK_BTN → Step (latch clears only then).'
    ]
  },
  'rung-2oo3': {
    goal: 'Need any two transmitters high before the trip — one alone is not enough.',
    tryThis: [
      'Force only one LSHH_* on → Step (no trip).',
      'Force a second one on → Step (vote trips).'
    ]
  },
  'rung-ton-lockout': {
    goal: 'After a trip, wait out the lockout before restart is allowed.',
    tryThis: [
      'Assert TRIP_LAT → Auto-scan until the timer DN lights.',
      'Clear the trip mid-wait → lockout should drop.'
    ]
  },
  'rung-tof-cooldown': {
    goal: 'Fan keeps running a while after the machine stops, then dies on its own.',
    tryThis: [
      'Set MOTOR_RUNNING on, then off → watch the TOF hold the fan.',
      'Auto-scan until the run-on times out.'
    ]
  },
  'rung-ctu-strokes': {
    goal: 'Each stroke edge adds one count until the batch target is hit.',
    tryThis: [
      'Pulse the stroke input several times → Step each rising edge.',
      'Hit reset / new batch → count returns to zero.'
    ]
  },
  'rung-alarm-deadbnd': {
    goal: 'Cross high once to alarm; it should not chatter near the limit.',
    tryThis: [
      'Raise LEVEL_PV above the high limit → Auto-scan until alarm sets.',
      'Nudge it just below high (still above deadband) → alarm stays; drop further to clear.'
    ]
  },
  'rung-jt-permissive': {
    goal: 'Open the J-T path only when every permissive is true — then prove it opened.',
    tryThis: [
      'Clear one permissive → open command must stay blocked.',
      'Satisfy all, command open, then set proved-open feedback.'
    ]
  },
  'rung-cap-close': {
    goal: 'Close only after discharge wait + key + electrical permissives are all good.',
    tryThis: [
      'Leave the discharge timer short of DN → close stays blocked.',
      'Satisfy key + permissives, let timer finish → close pulse appears.'
    ]
  },
  'rung-pid-level': {
    goal: 'See auto / manual / override fight for the valve — override wins when level runs away.',
    tryThis: [
      'Switch modes and Step — watch which path owns the output.',
      'Drive level high into override → override output takes the valve.'
    ]
  },
  'rung-purge': {
    goal: 'Fuel stays locked out until purge time finishes; flame fail forces a re-purge.',
    tryThis: [
      'Healthy permissives + Auto-scan until purge DN → fuel path enables.',
      'Assert FLAME_FAIL → fuel drops and purge must run again.'
    ]
  },
  'rung-firstout': {
    goal: 'First trip cause freezes in the reason register — later alarms do not overwrite it.',
    tryThis: [
      'Fire one cause → Step (reason captured).',
      'Fire a second cause → reason stays with the first.'
    ]
  },
  'rung-antisurge': {
    goal: 'Low flow / surge approach opens the recycle valve to protect the compressor.',
    tryThis: [
      'Drop suction flow toward surge → recycle opens.',
      'Restore healthy flow → recycle can close again.'
    ]
  },
  'rung-esd-fg': {
    goal: 'Gas alarm (after delay) de-energizes the ESD solenoid — loss of power fails safe.',
    tryThis: [
      'Assert a gas detector → Auto-scan through the confirm delay → ESD drops.',
      'Try bypass — see how it changes the path (and why that is dangerous).'
    ]
  },
  'rung-leadlag': {
    goal: 'Start the standby before stopping the lead so pressure does not dip.',
    tryThis: [
      'Request a lead/lag swap → Step through start-standby then stop-lead.',
      'Watch both run bits during the handoff.'
    ]
  },
  'rung-scaling': {
    goal: 'Bad / out-of-range raw mA must invalidate the engineering value.',
    tryThis: [
      'Set a healthy raw (e.g. mid-scale) → scaled EU looks sane.',
      'Drive raw below live-zero → quality fails / value rejected.'
    ]
  },
  'rung-seq-step': {
    goal: 'Advance only when the step condition + dwell are done; any interlock holds the sequence.',
    tryThis: [
      'Meet the step condition → Auto-scan through dwell → step advances.',
      'Drop an interlock mid-step → sequence holds / faults.'
    ]
  }
};
