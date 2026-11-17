/**
 * Breadcrumbs must not point at /s or /e, which are not routes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { breadcrumbItems } from '../web/src/lib/crumbs.js';
import { SECTIONS } from '../server/src/seed/sections.js';
import { buildEntries } from '../server/src/seed/index.js';

const NOT_FOUND = new Set(['/s', '/e']);

function linked(pathname) {
  return breadcrumbItems(pathname, SECTIONS).filter((item) => item.to).map((item) => item.to);
}

test('section crumbs do not link to /s', () => {
  for (const section of SECTIONS) {
    const hrefs = linked(`/s/${section.slug}`);
    assert.deepEqual(hrefs, ['/']);
    assert.equal(breadcrumbItems(`/s/${section.slug}`, SECTIONS).at(-1).label, section.label);
  }
});

test('every entry crumb links to its section, never to /e', () => {
  const slugs = new Set(SECTIONS.map((section) => section.slug));
  const entries = buildEntries();
  assert.ok(entries.length >= 735);
  for (const entry of entries) {
    const hrefs = linked(`/e/${encodeURIComponent(entry.id)}`);
    assert.ok(!hrefs.some((href) => NOT_FOUND.has(href)), `${entry.id}: ${hrefs.join(' ')}`);
    assert.equal(hrefs[0], '/');
    assert.equal(hrefs[1], `/s/${encodeURIComponent(entry.section)}`);
    assert.ok(slugs.has(entry.section), entry.id);
  }
});

test('exercise and tool crumbs stay on real routes', () => {
  assert.deepEqual(linked('/exercises/lamp-follows'), ['/', '/exercises']);
  assert.deepEqual(linked('/editor'), ['/']);
  assert.deepEqual(linked('/'), ['/']);
});

test('home names exercises and uses the level title on practice cards', () => {
  const home = readFileSync(new URL('../web/src/pages/Home.jsx', import.meta.url), 'utf8');
  assert.match(home, /to="\/exercises"/);
  assert.match(home, /rung-lab-title">\{l\.levelTitle\}/);
});

test('the note field is named Your note and describes the session store', () => {
  const page = readFileSync(new URL('../web/src/pages/Entry.jsx', import.meta.url), 'utf8');
  assert.match(page, /id="entry-note-heading"/);
  assert.match(page, /aria-labelledby="entry-note-heading"/);
  assert.match(page, /this browser session/);
  assert.doesNotMatch(page, /local SQLite|on this device/);
});
