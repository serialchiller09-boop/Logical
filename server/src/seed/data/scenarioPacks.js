/**
 * Guided practice-panel labs (Phase E1).
 *
 * Pins the classroom labs that deep-link into rung entries with the practice-panel dock.
 * Checklist / goal / scan hints live on RUNG_GOALS for the same rung ids — one source for
 * Entry chrome and Home cards (no second tutorial system).
 */
export const GUIDED_PANEL_SCENARIOS = [
  {
    rungId: 'rung-seal-in',
    cardTitle: 'Seal-in',
    order: 1,
    dockTags: ['HMI_START', 'HMI_STOP', 'COMMON_TRIP', 'LOP_RUN'],
    scanHint: 'After you turn Start off, press Step once more. LOP_RUN should still be on — that hold path is the seal-in.'
  },
  {
    rungId: 'rung-latch-ack',
    cardTitle: 'Latch and acknowledge',
    order: 2,
    dockTags: ['LSP_PSL', 'ACK_BTN', 'TRIP_LAT'],
    scanHint: 'Turning the cause off by itself is not enough. TRIP_LAT stays on until you press Ack while the cause is already clear.'
  },
  {
    rungId: 'rung-2oo3',
    cardTitle: 'Two-out-of-three voting',
    order: 3,
    dockTags: ['LSHH_A', 'LSHH_B', 'LSHH_C', 'TRIP_VOTE'],
    scanHint: 'With only one high-level switch on, TRIP_VOTE should stay off. After a second switch is on, press Step and TRIP_VOTE should turn on.'
  },
  {
    rungId: 'rung-ton-lockout',
    cardTitle: 'Timer lockout',
    order: 4,
    dockTags: ['TRIP_LAT', 'RESTART_BLOCK'],
    scanHint: 'Leave the trip on and use Auto-scan until the lockout timer finishes. When the timer DN is true, RESTART_BLOCK should turn off.'
  }
];

/** Map rung authoring id → scenario meta (dock emphasis + teaching hint). */
export const SCENARIO_BY_RUNG = Object.fromEntries(
  GUIDED_PANEL_SCENARIOS.map((s) => [s.rungId, s])
);
