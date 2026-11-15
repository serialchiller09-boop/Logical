/**
 * PR 3 — calm dock layout helpers (list + panel-below on busy rungs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSY_DOCK_TAG_COUNT,
  isBusyDock,
  preferDockList,
  resolveDockLayout
} from '../web/src/lib/dockLayout.js';
import { pathLevelHref, PROGRESSIVE_PATH_LEVELS } from '../web/src/data/progressivePath.js';

test('busy dock detects many tags or long role labels', () => {
  assert.equal(isBusyDock({ dockTags: ['A', 'B'] }), false);
  assert.equal(isBusyDock({ dockTags: Array.from({ length: BUSY_DOCK_TAG_COUNT }, (_, i) => `T${i}`) }), true);
  assert.equal(
    isBusyDock({
      dockTags: ['A'],
      io: [{ tag: 'A', role: 'Disconnect or access door open - blocks close when true' }]
    }),
    true
  );
});

test('preferDockList for focus-only path docks and busy plates', () => {
  assert.equal(preferDockList({ focusOnly: true, dockTags: ['HMI_START', 'LOP_RUN'] }), true);
  assert.equal(preferDockList({ focusOnly: false, dockTags: ['A', 'B'] }), false);
  assert.equal(
    preferDockList({
      focusOnly: false,
      dockTags: Array.from({ length: 6 }, (_, i) => `T${i}`)
    }),
    true
  );
});

test('resolveDockLayout: query wins, then preferBelow, then saved, then side', () => {
  assert.equal(resolveDockLayout({ searchLayout: 'side', preferBelow: true }), 'side');
  assert.equal(resolveDockLayout({ searchLayout: 'below' }), 'below');
  assert.equal(resolveDockLayout({ searchLayout: null, preferBelow: true, savedLayout: 'side' }), 'below');
  assert.equal(resolveDockLayout({ searchLayout: null, preferBelow: false, savedLayout: 'hidden' }), 'hidden');
  assert.equal(resolveDockLayout({}), 'side');
});

test('cap-bank path levels open with panel below; short early levels stay side', () => {
  const early = PROGRESSIVE_PATH_LEVELS.filter((l) => l.level <= 5);
  const late = PROGRESSIVE_PATH_LEVELS.filter((l) => l.level >= 6);
  for (const l of early) assert.match(pathLevelHref(l), /dock=side/);
  for (const l of late) assert.match(pathLevelHref(l), /dock=below/);
});
