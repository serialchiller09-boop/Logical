/**
 * Beginner progressive path (Level 1…8) — Home / Entry discovery.
 * Source of truth for copy + dock focus is server seed scenarioPacks.js;
 * this module re-exports it so the UI stays in lockstep with tests.
 */
import {
  PROGRESSIVE_PATH_LEVELS,
  PATH_LEVEL_BY_NUMBER,
  GUIDED_PANEL_SCENARIOS
} from '../../../server/src/seed/data/scenarioPacks.js';

export { PROGRESSIVE_PATH_LEVELS, PATH_LEVEL_BY_NUMBER, GUIDED_PANEL_SCENARIOS };

/** Entry id for a path level (`rungs:<rungId>`). */
export function pathLevelEntryId(level) {
  return `rungs:${level.rungId}`;
}

/**
 * Deep-link into a path level with practice panel + focus flags.
 * Open path: every level is clickable (no unlock gate).
 */
export function pathLevelHref(level) {
  const params = new URLSearchParams({
    dock: 'side',
    level: String(level.level),
    focus: level.focusId || 'full'
  });
  return `/e/${encodeURIComponent(pathLevelEntryId(level))}?${params.toString()}`;
}

/** Resolve a path level from query (`level` preferred, else `focus` on this rung). */
export function findPathLevel({ entryId, levelParam, focusParam }) {
  const rungId = String(entryId || '').replace(/^rungs:/, '');
  const n = Number(levelParam);
  if (Number.isInteger(n) && n >= 1) {
    const byNum = PATH_LEVEL_BY_NUMBER[n] || PROGRESSIVE_PATH_LEVELS.find((l) => l.level === n);
    if (byNum && byNum.rungId === rungId) return byNum;
  }
  if (focusParam) {
    const byFocus = PROGRESSIVE_PATH_LEVELS.find(
      (l) => l.rungId === rungId && l.focusId === focusParam
    );
    if (byFocus) return byFocus;
  }
  // Default: first path level for this rung (seal-in → 1; cap → 6)
  return PROGRESSIVE_PATH_LEVELS.find((l) => l.rungId === rungId) || null;
}

export function nextPathLevel(level) {
  if (!level) return null;
  return PATH_LEVEL_BY_NUMBER[level.level + 1]
    || PROGRESSIVE_PATH_LEVELS.find((l) => l.level === level.level + 1)
    || null;
}
