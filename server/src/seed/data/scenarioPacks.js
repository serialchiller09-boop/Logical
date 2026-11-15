/**
 * Guided practice-panel labs + beginner progressive path (PR 1: content).
 *
 * PROGRESSIVE_PATH_LEVELS is the ordered Level 1…8 path (open path — all clickable later).
 * Cap-bank levels 6–7–8 share one entry (`rung-cap-close`) via focus flags — not sibling copies.
 * Level 1 is seal-in with a first-minute dock filter (Start + Run lamp only).
 *
 * GUIDED_PANEL_SCENARIOS pins unique rung entries that deep-link with the practice-panel dock.
 * Checklist / goal / scan hints for the entry page live on RUNG_GOALS; path-level copy that
 * differs by focus lives on PROGRESSIVE_PATH_LEVELS for Home/Entry to consume in later PRs.
 */

/** Cap-bank boss dock set (level 8) — full close + discharge proofs. */
const CAP_FULL_DOCK = [
  'CAP1_CloseReq',
  'BUS101_Energized',
  'CAP1_RelayHealthy',
  'DI_K1AtBreaker',
  'CAP1_DisconnectOpen',
  'L_86Lockout',
  'T_CAP1_Discharge',
  'CAP1_52a',
  'CAP1_NoCurrent',
  'CAP1_KeyReleaseReq',
  'CAP1_CloseCmd'
];

/** Level 6 — series AND slice: a short close chain (not the full bank plate). */
const CAP_SERIES_AND_DOCK = [
  'CAP1_CloseReq',
  'BUS101_Energized',
  'CAP1_RelayHealthy',
  'DI_K1AtBreaker',
  'CAP1_CloseCmd'
];

/** Level 7 — discharge wait slice only. */
const CAP_DISCHARGE_DOCK = [
  'CAP1_52a',
  'CAP1_NoCurrent',
  'CAP1_KeyReleaseReq',
  'T_CAP1_Discharge'
];

/** Level 1 — seal-in first minute: Start + Run lamp only. */
const SEAL_IN_FIRST_MINUTE_DOCK = ['HMI_START', 'LOP_RUN'];

/** Level 2 — full seal-in practice dock. */
const SEAL_IN_FULL_DOCK = ['HMI_START', 'HMI_STOP', 'COMMON_TRIP', 'LOP_RUN'];

/**
 * Ordered beginner path (levels 1–8).
 * Multiple levels may share a rungId; focusId + dockTags tell later UI what to show.
 */
export const PROGRESSIVE_PATH_LEVELS = [
  {
    level: 1,
    levelTitle: 'Force and lamp',
    cardTitle: 'Force and lamp',
    rungId: 'rung-seal-in',
    focusId: 'first-minute',
    pathLab: true,
    dockTags: SEAL_IN_FIRST_MINUTE_DOCK,
    goal: 'Turn Start on, press Step, and watch the Run lamp turn on.',
    tryThis: [
      'Turn on HMI_START. Press Step. The pump lamp (LOP_RUN) should turn on.',
      'Leave Start on and press Step again. LOP_RUN should still be on.'
    ],
    scanHint: 'With HMI_START on, press Step once. LOP_RUN should turn on. That is force in, lamp out.'
  },
  {
    level: 2,
    levelTitle: 'Seal-in',
    cardTitle: 'Seal-in',
    rungId: 'rung-seal-in',
    focusId: 'full',
    pathLab: true,
    dockTags: SEAL_IN_FULL_DOCK,
    goal: 'Start the pump, then turn Start off. The pump should keep running until you stop it.',
    tryThis: [
      'Turn on HMI_START. Press Step. Turn HMI_START off. Press Step again. The pump lamp (LOP_RUN) should stay on.',
      'Turn on HMI_STOP or COMMON_TRIP. Press Step. The pump should turn off.'
    ],
    scanHint: 'After you turn Start off, press Step once more. LOP_RUN should still be on — that hold path is the seal-in.'
  },
  {
    level: 3,
    levelTitle: 'Latch and acknowledge',
    cardTitle: 'Latch and acknowledge',
    rungId: 'rung-latch-ack',
    focusId: 'full',
    pathLab: true,
    dockTags: ['LSP_PSL', 'ACK_BTN', 'TRIP_LAT'],
    goal: 'When something trips, the trip stays on even after the cause clears. Clear the cause and press Ack to reset it.',
    tryThis: [
      'Turn on LSP_PSL (the trip cause). Press Step. TRIP_LAT should turn on and stay on.',
      'Turn LSP_PSL off, then turn on ACK_BTN. Press Step. TRIP_LAT should clear only after both of those.'
    ],
    scanHint: 'Turning the cause off by itself is not enough. TRIP_LAT stays on until you press Ack while the cause is already clear.'
  },
  {
    level: 4,
    levelTitle: 'Two-out-of-three',
    cardTitle: 'Two-out-of-three voting',
    rungId: 'rung-2oo3',
    focusId: 'full',
    pathLab: true,
    dockTags: ['LSHH_A', 'LSHH_B', 'LSHH_C', 'TRIP_VOTE'],
    goal: 'Two of the three high-level switches must be on before the trip turns on. One alone is not enough.',
    tryThis: [
      'Turn on only one high-level switch (LSHH_A, LSHH_B, or LSHH_C). Press Step. The trip should stay off.',
      'Turn on a second high-level switch. Press Step. Now the trip should turn on (two out of three).'
    ],
    scanHint: 'With only one high-level switch on, TRIP_VOTE should stay off. After a second switch is on, press Step and TRIP_VOTE should turn on.'
  },
  {
    level: 5,
    levelTitle: 'Timer lockout',
    cardTitle: 'Timer lockout',
    rungId: 'rung-ton-lockout',
    focusId: 'full',
    pathLab: true,
    dockTags: ['TRIP_LAT', 'RESTART_BLOCK'],
    goal: 'After a trip, wait for the lockout timer to finish before a restart is allowed.',
    tryThis: [
      'Turn on TRIP_LAT. Press Auto-scan and wait until the timer finishes (DN lights). RESTART_BLOCK should then clear.',
      'While the timer is still running, turn TRIP_LAT off. The lockout should drop right away.'
    ],
    scanHint: 'Leave the trip on and use Auto-scan until the lockout timer finishes. When the timer DN is true, RESTART_BLOCK should turn off.'
  },
  {
    level: 6,
    levelTitle: 'Series AND',
    cardTitle: 'Series AND',
    rungId: 'rung-cap-close',
    focusId: 'series-and',
    pathLab: true,
    dockTags: CAP_SERIES_AND_DOCK,
    goal: 'See that one false contact in series blocks the close command — every link must be true.',
    tryThis: [
      'Turn three of CAP1_CloseReq, BUS101_Energized, CAP1_RelayHealthy, and DI_K1AtBreaker on; leave one off. Press Step. CAP1_CloseCmd should stay off.',
      'Turn all four on. Press Step. If the discharge wait and other bank proofs are not finished yet, close still stays off — series means every contact, not just these four.'
    ],
    scanHint: 'Any one open contact in the chain blocks CAP1_CloseCmd. These four are only part of the series — later levels add the discharge wait and the rest.'
  },
  {
    level: 7,
    levelTitle: 'Discharge wait',
    cardTitle: 'Discharge wait',
    rungId: 'rung-cap-close',
    focusId: 'discharge',
    pathLab: true,
    dockTags: CAP_DISCHARGE_DOCK,
    goal: 'Run the discharge wait until DN lights. The timer is a wait — not proof the bank is safe.',
    tryThis: [
      'Set CAP1_52a off (breaker open), CAP1_NoCurrent on, and CAP1_KeyReleaseReq on. Press Auto-scan until the timer DN lights.',
      'While the timer is still running, turn CAP1_NoCurrent off. The wait should reset — DN drops.'
    ],
    scanHint: 'Keep open + no-current + release request true through Auto-scan until DN. Dropping a proof resets the wait. DN is a clock, not a safety proof.'
  },
  {
    level: 8,
    levelTitle: 'Cap bank close',
    cardTitle: 'Cap bank close',
    rungId: 'rung-cap-close',
    focusId: 'full-close',
    pathLab: true,
    dockTags: CAP_FULL_DOCK,
    goal: 'Make the close command pulse once only when every permissive is true and the wait finishes. The timer is a wait, not a safety proof.',
    tryThis: [
      'Leave the discharge timer short of DN. Keep other permissives true. Press Step — CAP1_CloseCmd should stay off.',
      'Satisfy key + electrical permissives, let the wait finish (DN), keep the breaker open, then press Step — CAP1_CloseCmd should pulse once.'
    ],
    scanHint: 'CAP1_CloseCmd pulses only when the full AND chain is true, including discharge DN. The timer is a wait — not proof the bank is safe to touch.'
  }
];

/**
 * Unique rung entries that carry panelScenario payload (Home deep-links + Entry dock).
 * Cap bank is one entry; levels 6–7–8 are focus flags on that entry (pathFocuses).
 * Seal-in carries firstMinuteDockTags for level 1 (PR 2 filters the dock).
 */
export const GUIDED_PANEL_SCENARIOS = [
  {
    rungId: 'rung-seal-in',
    cardTitle: 'Seal-in',
    levelTitle: 'Seal-in',
    order: 2,
    pathLevels: [1, 2],
    pathLab: true,
    dockTags: SEAL_IN_FULL_DOCK,
    firstMinuteDockTags: SEAL_IN_FIRST_MINUTE_DOCK,
    focusStepTags: {
      'first-minute': SEAL_IN_FIRST_MINUTE_DOCK,
      full: SEAL_IN_FULL_DOCK
    },
    scanHint: 'After you turn Start off, press Step once more. LOP_RUN should still be on — that hold path is the seal-in.'
  },
  {
    rungId: 'rung-latch-ack',
    cardTitle: 'Latch and acknowledge',
    levelTitle: 'Latch and acknowledge',
    order: 3,
    pathLevels: [3],
    pathLab: true,
    dockTags: ['LSP_PSL', 'ACK_BTN', 'TRIP_LAT'],
    scanHint: 'Turning the cause off by itself is not enough. TRIP_LAT stays on until you press Ack while the cause is already clear.'
  },
  {
    rungId: 'rung-2oo3',
    cardTitle: 'Two-out-of-three voting',
    levelTitle: 'Two-out-of-three',
    order: 4,
    pathLevels: [4],
    pathLab: true,
    dockTags: ['LSHH_A', 'LSHH_B', 'LSHH_C', 'TRIP_VOTE'],
    scanHint: 'With only one high-level switch on, TRIP_VOTE should stay off. After a second switch is on, press Step and TRIP_VOTE should turn on.'
  },
  {
    rungId: 'rung-ton-lockout',
    cardTitle: 'Timer lockout',
    levelTitle: 'Timer lockout',
    order: 5,
    pathLevels: [5],
    pathLab: true,
    dockTags: ['TRIP_LAT', 'RESTART_BLOCK'],
    scanHint: 'Leave the trip on and use Auto-scan until the lockout timer finishes. When the timer DN is true, RESTART_BLOCK should turn off.'
  },
  {
    rungId: 'rung-cap-close',
    cardTitle: 'Cap bank close',
    levelTitle: 'Cap bank close',
    order: 8,
    pathLevels: [6, 7, 8],
    pathLab: true,
    dockTags: CAP_FULL_DOCK,
    pathFocuses: [
      {
        level: 6,
        focusId: 'series-and',
        levelTitle: 'Series AND',
        dockTags: CAP_SERIES_AND_DOCK
      },
      {
        level: 7,
        focusId: 'discharge',
        levelTitle: 'Discharge wait',
        dockTags: CAP_DISCHARGE_DOCK
      },
      {
        level: 8,
        focusId: 'full-close',
        levelTitle: 'Cap bank close',
        dockTags: CAP_FULL_DOCK
      }
    ],
    focusStepTags: {
      'series-and': CAP_SERIES_AND_DOCK,
      discharge: CAP_DISCHARGE_DOCK,
      'full-close': CAP_FULL_DOCK
    },
    scanHint: 'CAP1_CloseCmd pulses only when the full AND chain is true, including discharge DN. The timer is a wait — not proof the bank is safe to touch.'
  }
];

/** Map rung authoring id → scenario meta (dock emphasis + teaching hint). */
export const SCENARIO_BY_RUNG = Object.fromEntries(
  GUIDED_PANEL_SCENARIOS.map((s) => [s.rungId, s])
);

/** Map path level number → level meta. */
export const PATH_LEVEL_BY_NUMBER = Object.fromEntries(
  PROGRESSIVE_PATH_LEVELS.map((l) => [l.level, l])
);
