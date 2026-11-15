/**
 * Practice-panel layout helpers (calm dock / PR 3).
 * Busy rungs (many dock tags or long role labels) default to panel-below + list rows.
 */

/** Tag count that makes a side column too cramped for full labels. */
export const BUSY_DOCK_TAG_COUNT = 5;

/** Role / label length that should not sit in a tiny card cell. */
export const LONG_DOCK_LABEL_CHARS = 28;

export function isBusyDock({ dockTags = [], io = [] } = {}) {
  if (Array.isArray(dockTags) && dockTags.length >= BUSY_DOCK_TAG_COUNT) return true;
  const roles = Array.isArray(io)
    ? io.map((p) => String(p?.role || p?.label || '')).filter(Boolean)
    : [];
  return roles.some((r) => r.length >= LONG_DOCK_LABEL_CHARS);
}

/** Prefer list rows when filtering to dockTags or when the plate is busy. */
export function preferDockList({ focusOnly = false, dockTags = [], io = [] } = {}) {
  return !!focusOnly || isBusyDock({ dockTags, io });
}

/**
 * Resolve dock placement: URL query wins, then explicit preferBelow for busy path labs,
 * then saved preference, then side.
 */
export function resolveDockLayout({
  searchLayout = null,
  savedLayout = null,
  preferBelow = false
} = {}) {
  if (searchLayout === 'side' || searchLayout === 'below' || searchLayout === 'hidden') {
    return searchLayout;
  }
  if (preferBelow) return 'below';
  if (savedLayout === 'side' || savedLayout === 'below' || savedLayout === 'hidden') {
    return savedLayout;
  }
  return 'side';
}
