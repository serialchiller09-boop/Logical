#!/usr/bin/env node
/**
 * Seed the SQLite database from the version-controlled data modules.
 *
 *   npm run seed              idempotent: fills an empty database, no-op if already seeded
 *   npm run seed -- --force   re-apply content from source (bookmarks/notes/recents are preserved)
 *   npm run seed -- --reset   delete the database file first, then seed from scratch
 *
 * Content lives only in server/src/seed/**; the database is a derived artifact.
 */
import process from 'node:process';
import fs from 'node:fs';
import { DB_PATH, getDb, seed } from '../db.js';

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const reset = argv.includes('--reset');

if (reset) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.rmSync(DB_PATH + suffix); } catch { /* nothing to remove */ }
  }
  console.log('database removed — seeding from scratch');
}

getDb();
const result = await seed({ force });

const d = getDb();
const sections = d.prepare('SELECT slug, label, (SELECT COUNT(*) FROM entries e WHERE e.section = s.slug) AS n FROM sections s ORDER BY sort').all();
const byStatus = d.prepare('SELECT status, COUNT(*) AS n FROM entries GROUP BY status ORDER BY n DESC').all();

console.log(`\nLogical — ${result.skipped ? 'already seeded (no change)' : 'seeded from source data'}${force ? ' [forced]' : ''}`);
console.log(`  db      ${DB_PATH}`);
console.log(`  entries ${sections.reduce((n, s) => n + s.n, 0)} in ${sections.length} sections`);
for (const s of sections) console.log(`    ${String(s.n).padStart(4)}  ${s.label}  (${s.slug})`);
console.log('  provenance');
for (const s of byStatus) console.log(`    ${String(s.n).padStart(4)}  ${s.status}`);
if (result.plantEntriesKept) console.log(`  plant rows preserved: ${result.plantEntriesKept} (edited=1 entries are never overwritten)`);
if (result.skipped) console.log('\nNothing to do — database already seeded. Use --force to re-apply content from source, or --reset to start clean.');
console.log('');
