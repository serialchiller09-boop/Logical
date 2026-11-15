/**
 * Pinned practice-panel labs (Phase E1).
 * Entry ids must match seed `rungs:<rungId>` after buildEntries().
 * Goal / try-this / scan hints / dockTags live on the entry payload from seed —
 * this file is only for Home discovery order and deep-links (list API omits payload).
 */
export const PANEL_SCENARIOS = [
  { entryId: 'rungs:rung-seal-in', cardTitle: 'Seal-in', order: 1 },
  { entryId: 'rungs:rung-latch-ack', cardTitle: 'Latch and acknowledge', order: 2 },
  { entryId: 'rungs:rung-2oo3', cardTitle: 'Two-out-of-three voting', order: 3 },
  { entryId: 'rungs:rung-ton-lockout', cardTitle: 'Timer lockout', order: 4 }
];

export function panelScenarioHref(entryId) {
  return `/e/${encodeURIComponent(entryId)}?dock=side`;
}
