/**
 * PR 2 — Home / Entry progressive path UI helpers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSIVE_PATH_LEVELS } from '../server/src/seed/index.js';
import {
  PROGRESSIVE_PATH_LEVELS as WEB_PATH,
  findPathLevel,
  nextPathLevel,
  pathLevelEntryId,
  pathLevelHref
} from '../web/src/data/progressivePath.js';

test('web path module mirrors seed levels 1–8', () => {
  assert.equal(WEB_PATH.length, PROGRESSIVE_PATH_LEVELS.length);
  assert.equal(WEB_PATH.length, 8);
  for (let i = 0; i < WEB_PATH.length; i++) {
    assert.equal(WEB_PATH[i].level, PROGRESSIVE_PATH_LEVELS[i].level);
    assert.equal(WEB_PATH[i].rungId, PROGRESSIVE_PATH_LEVELS[i].rungId);
    assert.equal(WEB_PATH[i].focusId, PROGRESSIVE_PATH_LEVELS[i].focusId);
    assert.deepEqual(WEB_PATH[i].dockTags, PROGRESSIVE_PATH_LEVELS[i].dockTags);
    assert.equal(WEB_PATH[i].goal, PROGRESSIVE_PATH_LEVELS[i].goal);
  }
});

test('path deep-links are open (all clickable) with dock, level, and focus', () => {
  for (const l of WEB_PATH) {
    const href = pathLevelHref(l);
    assert.match(href, /^\/e\//);
    const busy = l.level >= 6 || l.dockTags.length >= 5;
    assert.match(href, busy ? /dock=below/ : /dock=side/);
    assert.match(href, new RegExp(`level=${l.level}`));
    assert.match(href, new RegExp(`focus=${encodeURIComponent(l.focusId)}`));
    assert.equal(pathLevelEntryId(l), `rungs:${l.rungId}`);
  }
});

test('findPathLevel resolves level query and focus on shared rung entries', () => {
  const l1 = findPathLevel({ entryId: 'rungs:rung-seal-in', levelParam: '1', focusParam: 'first-minute' });
  assert.equal(l1?.level, 1);
  assert.equal(l1?.focusId, 'first-minute');
  assert.deepEqual(l1?.dockTags, ['HMI_START', 'LOP_RUN']);

  const l2 = findPathLevel({ entryId: 'rungs:rung-seal-in', levelParam: '2' });
  assert.equal(l2?.level, 2);

  const l7 = findPathLevel({ entryId: 'rungs:rung-cap-close', focusParam: 'min-off' });
  assert.equal(l7?.level, 7);
  assert.equal(l7?.focusId, 'min-off');

  const defaultCap = findPathLevel({ entryId: 'rungs:rung-cap-close' });
  assert.equal(defaultCap?.level, 6);
});

test('nextPathLevel walks 1→8 then ends', () => {
  let cur = WEB_PATH[0];
  for (let n = 2; n <= 8; n++) {
    cur = nextPathLevel(cur);
    assert.equal(cur?.level, n);
  }
  assert.equal(nextPathLevel(cur), null);
});

test('cap-bank path goals name the 20 s min-off wait on levels 7–8', () => {
  for (const n of [7, 8]) {
    const l = WEB_PATH.find((x) => x.level === n);
    assert.match(l.goal, /The wait lets residual charge decay/);
    assert.doesNotMatch(`${l.goal} ${l.scanHint} ${l.tryThis.join(' ')}`, /SIM_891A_Closed|SIM_891G_Open/);
  }
  const boss = WEB_PATH.find((x) => x.level === 8);
  assert.equal(boss.tryThis.length, 9);
  assert.match(boss.dockTags.join(' '), /T_52C1_MinOff/);
});
