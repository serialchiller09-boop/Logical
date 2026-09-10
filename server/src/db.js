/**
 * SQLite layer on node:sqlite (no native build step required).
 * Reference content is seeded from version-controlled source and can be edited through the
 * admin API; user state (bookmarks, notes, recents) is stored separately so editing content
 * never touches personal data and reseeding never loses it.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.LOGICAL_DATA_DIR || join(__dirname, '..', 'data');
const DB_PATH = process.env.LOGICAL_DB || join(DATA_DIR, 'logical.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sections (
  slug        TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  grp         TEXT NOT NULL,
  icon        TEXT,
  blurb       TEXT,
  long        TEXT,
  sort        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entries (
  id          TEXT PRIMARY KEY,
  section     TEXT NOT NULL REFERENCES sections(slug),
  kind        TEXT,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  body        TEXT,
  status      TEXT,
  tags        TEXT,     -- JSON array
  sources     TEXT,     -- JSON array of {label,url}
  payload     TEXT,     -- JSON record
  search      TEXT,
  edited      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_section ON entries(section);
CREATE INDEX IF NOT EXISTS idx_entries_kind ON entries(section, kind);
CREATE INDEX IF NOT EXISTS idx_entries_title ON entries(title);

CREATE TABLE IF NOT EXISTS bookmarks (
  entry_id    TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  entry_id    TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recents (
  entry_id    TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  viewed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  views       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS seed_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);
`;

let db;
export function getDb() {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/* ---------- tiny helpers so the routes read like better-sqlite3 ---------- */
export function all(sql, params = []) {
  return getDb().prepare(sql).all(...params);
}
export function get(sql, params = []) {
  return getDb().prepare(sql).get(...params);
}
export function run(sql, params = []) {
  return getDb().prepare(sql).run(...params);
}
export function tx(fn) {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const out = fn();
    d.exec('COMMIT');
    return out;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}

const JSON_FIELDS = ['tags', 'sources', 'payload'];
function hydrate(row) {
  if (!row) return row;
  const out = { ...row };
  out.edited = !!out.edited;
  for (const f of JSON_FIELDS) {
    try { out[f] = out[f] ? JSON.parse(out[f]) : (f === 'payload' ? {} : []); }
    catch { out[f] = f === 'payload' ? {} : []; }
  }
  return out;
}

/** Load sections + entries from the seed module. Idempotent: skips when already populated
 *  unless `force`, in which case content is replaced but user state (bookmarks/notes/recents)
 *  is preserved for entries that still exist. */
export async function seed({ force = false } = {}) {
  const { SECTIONS, buildEntries } = await import('./seed/index.js');
  const d = getDb();
  const existing = d.prepare('SELECT COUNT(*) AS n FROM entries').get().n;
  const meta = d.prepare("SELECT v FROM seed_meta WHERE k = 'version'").get();
  const version = '1';

  if (!force && existing > 0 && meta?.v === version) {
    return { skipped: true, entries: existing };
  }

  return tx(() => {
    // Reference content (edited = 0) is replaced wholesale; rows flagged `edited` - your
    // plant-modified and plant-created entries - are never touched, so a reseed cannot
    // swallow the register you built on top of it. Order matters: entries first, because
    // entries.section has a foreign key onto sections.
    d.prepare('DELETE FROM entries WHERE edited = 0').run();

    d.prepare('DELETE FROM sections').run();
    for (const s of SECTIONS) {
      d.prepare('INSERT INTO sections (slug,label,grp,icon,blurb,long,sort) VALUES (?,?,?,?,?,?,?)')
        .run(s.slug, s.label, s.group, s.icon ?? '', s.blurb ?? '', s.long ?? '', s.sort);
    }

    const insert = d.prepare(`
      INSERT INTO entries (id,section,kind,title,subtitle,body,status,tags,sources,payload,search,edited)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,0)
      ON CONFLICT(id) DO UPDATE SET
        section=excluded.section, kind=excluded.kind, title=excluded.title, subtitle=excluded.subtitle,
        body=excluded.body, status=excluded.status, tags=excluded.tags, sources=excluded.sources,
        payload=excluded.payload, search=excluded.search, updated_at=datetime('now')
    `);
    const entries = buildEntries();
    for (const e of entries) {
      insert.run(
        e.id, e.section, e.kind, e.title, e.subtitle, e.body, e.status,
        JSON.stringify(e.tags), JSON.stringify(e.sources), JSON.stringify(e.payload), e.search
      );
    }
    d.prepare('INSERT INTO seed_meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v')
      .run('version', version);
    d.prepare('INSERT INTO seed_meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v')
      .run('seeded_at', new Date().toISOString());
    // bookmarks have no FK (they are a user list), so drop pointers to content that vanished
    d.prepare('DELETE FROM bookmarks WHERE entry_id NOT IN (SELECT id FROM entries)').run();
    const kept = d.prepare('SELECT COUNT(*) AS n FROM entries WHERE edited = 1').get().n;
    return { skipped: false, entries: entries.length, plantEntriesKept: kept };
  });
}

export { hydrate, DB_PATH, DATA_DIR };
