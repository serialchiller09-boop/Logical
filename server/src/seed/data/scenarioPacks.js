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

/** Level 8 — full 52C1 close plate. Switch placeholders stay at their defaults. */
const CAP_FULL_DOCK = [
  'DI_PB_52C1_Close',
  'DI_PB_52C1_Open',
  'DI_52C1_52a',
  'DI_52C1_52b',
  'P_52C1_ProvenOpen',
  'REQ_52C1_Close',
  'DI_CAP_RelayHealthy',
  'L_86Lockout',
  'T_52C1_MinOff',
  'P_52C1_Close',
  'T_52C1_ClosePulse',
  'CMD_52C1_Close',
  'CMD_52C1_Trip',
  'C_52C1_Operations'
];

/** Level 6 — series AND slice of the close chain. */
const CAP_SERIES_AND_DOCK = [
  'DI_PB_52C1_Close',
  'REQ_52C1_Close',
  'DI_CAP_RelayHealthy',
  'L_86Lockout',
  'P_52C1_ProvenOpen',
  'T_52C1_MinOff',
  'CMD_52C1_Close'
];

/** Level 7 — 20 s min-off wait. */
const CAP_MIN_OFF_DOCK = [
  'DI_52C1_52a',
  'DI_52C1_52b',
  'P_52C1_ProvenOpen',
  'T_52C1_MinOff'
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
    goal: 'Every contact in the close chain is true together before the close command turns on.',
    tryThis: [
      'Leave L_86Lockout off. Press Step. CMD_52C1_Close stays off. Why: the close command waits for an accepted request and the finished 20 s timer.',
      'Press Close and leave the breaker proven open. After the 20 s timer finishes, the close command turns on. Why: every series contact is true together.'
    ],
    scanHint: 'The close command turns on when every series contact is true and the 20 s wait has finished.'
  },
  {
    level: 7,
    levelTitle: '20 s min-off',
    cardTitle: '20 s min-off',
    rungId: 'rung-cap-close',
    focusId: 'min-off',
    pathLab: true,
    dockTags: CAP_MIN_OFF_DOCK,
    goal: 'Leave 52C1 proven open until the 20 s timer finishes. The wait lets residual charge decay.',
    tryThis: [
      'Leave DI_52C1_52b on and DI_52C1_52a off. Press Auto-scan until T_52C1_MinOff.DN is true. Why: the wait lets residual charge decay.',
      'Turn DI_52C1_52a on while the timer is running, then press Step. T_52C1_MinOff.ACC returns to zero. Why: a new proven-open period starts the timer at zero.'
    ],
    scanHint: 'Leave 52b on and 52a off. Auto-scan until the min-off timer finishes. The wait lets residual charge decay.'
  },
  {
    level: 8,
    levelTitle: 'Cap bank close',
    cardTitle: 'Cap bank close',
    rungId: 'rung-cap-close',
    focusId: 'full-close',
    pathLab: true,
    dockTags: CAP_FULL_DOCK,
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
      'With key A away, press Close on 891A. 891A stays open. Return key A with 52C1 still open, then close 891A. Why: 891A closes only when key A is back in its lock and 52C1 is still open.'
    ],
    scanHint: 'Press Close after the 20 s wait. The close command pulses. The wait lets residual charge decay.'
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
        focusId: 'min-off',
        levelTitle: '20 s min-off',
        dockTags: CAP_MIN_OFF_DOCK
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
      'min-off': CAP_MIN_OFF_DOCK,
      'full-close': CAP_FULL_DOCK
    },
    scanHint: 'Press Close after the 20 s wait. The close command pulses. The wait lets residual charge decay.'
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
