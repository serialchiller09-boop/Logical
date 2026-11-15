/**
 * Guided “Try with panel” scenario pack (Phase E1).
 *
 * Pins the classroom labs that deep-link into rung entries with the soft-panel dock.
 * Checklist / goal / scan hints live on RUNG_GOALS for the same rung ids — one source for
 * Entry chrome and Home cards (no second tutorial system).
 */
export const GUIDED_PANEL_SCENARIOS = [
  {
    rungId: 'rung-seal-in',
    cardTitle: 'Seal-in',
    order: 1,
    dockTags: ['HMI_START', 'HMI_STOP', 'COMMON_TRIP', 'LOP_RUN'],
    scanHint: 'After Start goes off, one more Step should still leave LOP_RUN on — that hold is the seal.'
  },
  {
    rungId: 'rung-latch-ack',
    cardTitle: 'Latch / ack',
    order: 2,
    dockTags: ['LSP_PSL', 'ACK_BTN', 'TRIP_LAT'],
    scanHint: 'Clearing the cause alone is not enough — TRIP_LAT should stay set until Ack with cause clear.'
  },
  {
    rungId: 'rung-2oo3',
    cardTitle: '2oo3 voting',
    order: 3,
    dockTags: ['LSHH_A', 'LSHH_B', 'LSHH_C', 'TRIP_VOTE'],
    scanHint: 'One high transmitter alone should not trip; any second high should set TRIP_VOTE after Step.'
  },
  {
    rungId: 'rung-ton-lockout',
    cardTitle: 'Timer lockout',
    order: 4,
    dockTags: ['TRIP_LAT', 'RESTART_BLOCK'],
    scanHint: 'With the trip held, Auto-scan until the lockout finishes — RESTART_BLOCK should release when .DN is true.'
  }
];

/** Map rung authoring id → scenario meta (dock emphasis + teaching hint). */
export const SCENARIO_BY_RUNG = Object.fromEntries(
  GUIDED_PANEL_SCENARIOS.map((s) => [s.rungId, s])
);
