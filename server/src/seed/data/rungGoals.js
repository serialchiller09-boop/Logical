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
  'rung-cap-close': withScenario('rung-cap-close', {
    goal: 'Make the close command pulse once only when every permissive is true and the wait finishes. The timer is a wait, not a safety proof.',
    tryThis: [
      'Leave the discharge timer short of DN. Keep other permissives true. Press Step — CAP1_CloseCmd should stay off.',
      'Satisfy key + electrical permissives, let the wait finish (DN), keep the breaker open, then press Step — CAP1_CloseCmd should pulse once.'
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
