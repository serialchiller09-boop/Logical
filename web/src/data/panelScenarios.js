/**
 * Pinned practice-panel labs (Home discovery).
 * Entry ids must match seed `rungs:<rungId>` after buildEntries().
 * Goal / try-this / scan hints / dockTags / path focus flags live on the entry payload
 * from seed — this file is only for Home discovery order and deep-links (list API omits payload).
 *
 * Progressive path Level 1…8 chrome is PR 2; here we pin each unique guided entry once
 * (seal-in, latch/ack, 2oo3, timer lockout, cap bank). Path order/titles for all eight
 * levels live in server seed `PROGRESSIVE_PATH_LEVELS`.
 */
export const PANEL_SCENARIOS = [
  { entryId: 'rungs:rung-seal-in', cardTitle: 'Seal-in', levelTitle: 'Seal-in', order: 2 },
  { entryId: 'rungs:rung-latch-ack', cardTitle: 'Latch and acknowledge', levelTitle: 'Latch and acknowledge', order: 3 },
  { entryId: 'rungs:rung-2oo3', cardTitle: 'Two-out-of-three voting', levelTitle: 'Two-out-of-three', order: 4 },
  { entryId: 'rungs:rung-ton-lockout', cardTitle: 'Timer lockout', levelTitle: 'Timer lockout', order: 5 },
  { entryId: 'rungs:rung-cap-close', cardTitle: 'Cap bank close', levelTitle: 'Cap bank close', order: 8 }
];

export function panelScenarioHref(entryId) {
  return `/e/${encodeURIComponent(entryId)}?dock=side`;
}
