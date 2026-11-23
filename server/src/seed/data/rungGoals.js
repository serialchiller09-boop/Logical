/**
 * Short, action-first copy for the ladder lab.
 * Kept separate from the long teaching prose on each rung so the UI can
 * lead with a goal without rewriting every purpose paragraph.
 *
 * Guided panel scenarios add panelScenario / dockTags / scanHint / path focus
 * flags via scenarioPacks.js — merged in seed/index.js so Entry and Home share one payload.
 */
import { SCENARIO_BY_RUNG } from './scenarioPacks.js';

function withScenario(rungId, lab) {
  const s = SCENARIO_BY_RUNG[rungId];
  if (!s) return lab;
  const out = {
    ...lab,
    panelScenario: true,
    pathLab: s.pathLab === true,
    scenarioOrder: s.order,
    scenarioCard: s.cardTitle,
    levelTitle: s.levelTitle || s.cardTitle,
    dockTags: s.dockTags,
    scanHint: s.scanHint
  };
  if (Array.isArray(s.pathLevels)) out.pathLevels = s.pathLevels;
  if (Array.isArray(s.firstMinuteDockTags)) out.firstMinuteDockTags = s.firstMinuteDockTags;
  if (s.focusStepTags && typeof s.focusStepTags === 'object') out.focusStepTags = s.focusStepTags;
  if (Array.isArray(s.pathFocuses)) out.pathFocuses = s.pathFocuses;
  return out;
}

export const RUNG_GOALS = {
  'rung-seal-in': withScenario('rung-seal-in', {
    goal: 'Start the pump, then turn Start off. The pump should keep running until you stop it.',
    tryThis: [
      'Turn on HMI_START. Press Step. Turn HMI_START off. Press Step again. The pump lamp (LOP_RUN) should stay on.',
      'Turn on HMI_STOP or COMMON_TRIP. Press Step. The pump should turn off.'
    ]
  }),
  'rung-latch-ack': withScenario('rung-latch-ack', {
    goal: 'When something trips, the trip stays on even after the cause clears. Clear the cause and press Ack to reset it.',
    tryThis: [
      'Turn on LSP_PSL (the trip cause). Press Step. TRIP_LAT should turn on and stay on.',
      'Turn LSP_PSL off, then turn on ACK_BTN. Press Step. TRIP_LAT should clear only after both of those.'
    ]
  }),
  'rung-2oo3': withScenario('rung-2oo3', {
    goal: 'Two of the three high-level switches must be on before the trip turns on. One alone is not enough.',
    tryThis: [
      'Turn on only one high-level switch (LSHH_A, LSHH_B, or LSHH_C). Press Step. The trip should stay off.',
      'Turn on a second high-level switch. Press Step. Now the trip should turn on (two out of three).'
    ]
  }),
  'rung-ton-lockout': withScenario('rung-ton-lockout', {
    goal: 'After a trip, wait for the lockout timer to finish before a restart is allowed.',
    tryThis: [
      'Turn on TRIP_LAT. Press Auto-scan and wait until the timer finishes (DN lights). RESTART_BLOCK should then clear.',
      'While the timer is still running, turn TRIP_LAT off. The lockout should drop right away.'
    ]
  }),
  'rung-tof-cooldown': {
    goal: 'Fan keeps running a while after the machine stops, then dies on its own.',
    tryThis: [
      'Turn MOTOR_RUNNING on, press Step, then turn it off. FAN_RUN stays on while T_COOL.DN is true on the following rung.',
      'Press Auto-scan until the run-on times out and T_COOL.DN drops — FAN_RUN should go off on that same follow-on rung.'
    ]
  },
  'rung-ctu-strokes': {
    goal: 'Each stroke edge adds one count until the batch target is hit.',
    tryThis: [
      'Pulse PUMP_SS on and off, pressing Step on each rising edge. When the count hits the target, C5:0.DN lights and the following rung sets BATCH_DONE.',
      'Turn on BATCH_START and press Step to RES the counter — ACC returns to zero and BATCH_DONE clears.'
    ]
  },
  'rung-alarm-deadbnd': {
    goal: 'Cross high once to alarm; it should not chatter near the limit.',
    tryThis: [
      'Raise LEVEL_PV above the high limit. Press Auto-scan until T_ALARM.DN lights — the following rung latches LSHH_ALM from that .DN bit.',
      'Nudge LEVEL_PV just below high (still above the deadband) — alarm stays. Drop further below the clear limit to unlatch.'
    ]
  },
  'rung-jt-permissive': {
    goal: 'Open the J-T path only when every permissive is true — then prove it opened.',
    tryThis: [
      'Clear one permissive and press Step — JT_OPEN_CMD must stay off.',
      'Satisfy every permissive so the valve commands open, leave JT_ZSO off, and Auto-scan until T_JTTIME.DN — the following rung latches JT_FAIL_OPEN from that .DN bit.'
    ]
  },
  'rung-cap-close': withScenario('rung-cap-close', {
    goal: 'Close 52C1 after the breaker has been proven open for 20 seconds. The wait lets residual charge decay.',
    tryThis: [
      'Turn on DI_PB_52C1_Open and press Step. CMD_52C1_Trip turns on. Why: the open pushbutton writes the trip command.',
      'Leave 52b on and 52a off. Auto-scan until T_52C1_MinOff.DN is true, then turn on DI_PB_52C1_Close and press Step. CMD_52C1_Close pulses. Why: the wait lets residual charge decay.',
      'With the breaker proven open and the wait still running, turn on DI_PB_52C1_Close and press Step. CMD_52C1_Close stays off. Why: the close command waits for the 20 s timer to finish.',
      'Turn both DI_52C1_52a and DI_52C1_52b on and press Step. P_52C1_ProvenOpen stays false and the close command stays off. Why: proven open is 52b on together with 52a off.',
      'Leave DI_52C1_52a off and press Step. Turn DI_52C1_52a on and press Step again. C_52C1_Operations adds one. Why: the counter counts each new close of the breaker.',
      'Leave 891A closed and press Step. Key A stays on the lock. Why: key A stays captive until 891A is locked open.',
      'With 52C1 proven open, open 891A and apply the lock-open lock. Key A comes free. Why: locking 891A open frees key A for the next step.',
      'With 52C1 closed, operate 891A. 891A stays in place and the HMI shows the reason. Why: 52C1 must be open to operate 891A.',
      'With key A away, ask 891A to close. 891A stays open. Return key A with 52C1 still open, then close 891A. Why: 891A closes only when key A is back in its lock and 52C1 is still open.'
    ]
  }),
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
      'Keep permissives healthy and press Auto-scan until T_PURGE.DN lights — the following rung then sets PURGE_OK from that .DN bit.',
      'Turn on FLAME_FAIL and press Step — fuel drops and the purge timer must run again before PURGE_OK returns.'
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
      'Turn on a gas detector and press Auto-scan through the confirm delay until T_FG.DN lights — the following rung then sets GAS_TRIP and the ESD path drops.',
      'Try the bypass path — see how it changes the trip, and why that is dangerous in a real plant.'
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
      'Meet the step condition and press Auto-scan through the dwell until T_DWELL.DN lights — the following rung then advances the step from that .DN bit.',
      'Drop an interlock mid-step and press Step — the sequence holds or faults instead of advancing.'
    ]
  }
};
