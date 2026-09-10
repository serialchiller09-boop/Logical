import { Router } from 'express';
import { all, get, hydrate } from '../db.js';
import { decodeTag } from '../lib/tagDecode.js';

export const router = Router();

const COLS_CARD = 'id,section,kind,title,subtitle,body,status,tags,sources,edited,updated_at';
const SELECT_CARD = `SELECT ${COLS_CARD} FROM entries`;

/** Rows for the ranking pass must include the `search` blob, but must not ship it. */
const SELECT_SEARCHABLE = `SELECT id,section,kind,title,subtitle,body,status,tags,sources,edited,updated_at,search FROM entries`;

function toCard(row) { return hydrate(row); }

/* ------------------------------------------------ sections */
router.get('/sections', (_req, res) => {
  const sections = all(`
    SELECT s.slug, s.label, s.grp AS "group", s.icon, s.blurb, s.long, s.sort,
           (SELECT COUNT(*) FROM entries e WHERE e.section = s.slug) AS total
    FROM sections s ORDER BY s.sort`);
  const kindsBySection = all('SELECT section, kind, COUNT(*) AS n FROM entries GROUP BY section, kind');
  const byStatus = all('SELECT section, status, COUNT(*) AS n FROM entries GROUP BY section, status');
  const kinds = {};
  const statusBreak = {};
  for (const k of kindsBySection) (kinds[k.section] ??= []).push({ kind: k.kind, count: k.n });
  for (const k of byStatus) (statusBreak[k.section] ??= {})[k.status] = k.n;
  for (const s of sections) {
    s.kinds = Object.fromEntries((kinds[s.slug] || []).map((k) => [k.kind, k.count]));
    s.statusBreakdown = statusBreak[s.slug] || {};
  }
  res.json({ sections, kinds, total: sections.reduce((n, s) => n + s.total, 0) });
});

/* ------------------------------------------------ list + filter */
router.get('/entries', (req, res) => {
  const { section, kind, status, q } = req.query;
  const limit = Math.min(parseInt(req.query.limit ?? '500', 10) || 500, 2000);
  const offset = Math.max(parseInt(req.query.offset ?? '0', 10) || 0, 0);

  const where = [];
  const params = [];
  if (section) { where.push('section = ?'); params.push(String(section)); }
  if (kind) { where.push('kind = ?'); params.push(String(kind)); }
  if (status) { where.push('status = ?'); params.push(String(status)); }
  if (q) {
    where.push('(lower(title) LIKE ? OR lower(search) LIKE ?)');
    params.push(`%${String(q).toLowerCase()}%`, `%${String(q).toLowerCase()}%`);
  }
  const sql = `${SELECT_CARD}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
    ORDER BY CASE WHEN edited THEN 0 ELSE 1 END, title COLLATE NOCASE LIMIT ? OFFSET ?`;
  const rows = all(sql, [...params, limit, offset]);
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const total = all(`SELECT COUNT(*) AS n FROM entries${whereSql}`, params).reduce((n, r) => n + r.n, 0);
  res.json({ count: rows.length, total, limit, offset, entries: rows.map(toCard) });
});

/* ------------------------------------------------ search (grouped, with snippets) */
router.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  if (q.length < 2) return res.json({ query: q, groups: [], total: 0 });

  const terms = q.split(/\s+/).filter(Boolean);
  const rows = all(SELECT_SEARCHABLE);
  const scored = [];
  for (const r of rows) {
    const title = (r.title || '').toLowerCase();
    const hay = (r.search || '').toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (!hay.includes(t)) { score = -1; break; }
      if (title === t) score += 12;
      else if (title.startsWith(t)) score += 8;
      else if (title.includes(t)) score += 5;
      const section = (r.section || '').toLowerCase();
      if (section.includes(t)) score += 3;
      if (hay.includes(t)) score += 1;
    }
    if (score > 0) {
      if (r.edited) score += 2;
      const { search, ...card } = r;
      const entry = toCard(card);
      entry.snippet = makeSnippet(hay, terms);
      scored.push({ ...entry, score });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const groups = new Map();
  for (const e of scored) {
    if (!groups.has(e.section)) groups.set(e.section, []);
    if (groups.get(e.section).length < 8) groups.get(e.section).push(e);
  }
  const labels = Object.fromEntries(all('SELECT slug, label FROM sections').map((s) => [s.slug, s.label]));
  res.json({
    query: q,
    total: scored.length,
    groups: [...groups.entries()].map(([slug, entries]) => ({
      section: slug, label: labels[slug] ?? slug, count: scored.filter((s) => s.section === slug).length, entries
    }))
  });
});

function makeSnippet(hay, terms) {
  const idx = Math.max(0, ...terms.map((t) => { const i = hay.indexOf(t); return i < 0 ? 0 : i; }));
  const start = Math.max(0, idx - 60);
  return (start > 0 ? '\u2026' : '') + hay.slice(start, start + 220).trim() + (hay.length > start + 220 ? '\u2026' : '');
}

/* ------------------------------------------------ one entry */
router.get('/entries/:id', (req, res) => {
  const row = get(`SELECT ${COLS_CARD},payload,created_at FROM entries WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Entry not found', id: req.params.id });
  const entry = hydrate(row);
  const section = get('SELECT slug,label,grp AS "group" FROM sections WHERE slug = ?', [entry.section]);
  const siblings = all(
    'SELECT id,title,kind FROM entries WHERE section = ? ORDER BY title COLLATE NOCASE',
    [entry.section]
  ).map(toCard);
  const idx = siblings.findIndex((s) => s.id === entry.id);
  res.json({
    entry,
    section,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    note: get('SELECT entry_id, body, updated_at FROM notes WHERE entry_id = ?', [req.params.id])
      ?? { entry_id: req.params.id, body: '' },
    disclaimer: 'Reference material only: setpoints, limits and safety-related values must come from your plant documents.'
  });
});

/* ------------------------------------------------ tag decoder */
router.get('/tag', (req, res) => {
  const tag = String(req.query.tag ?? '').trim();
  res.json(decodeTag(tag));
});

/* ------------------------------------------------ stats */
router.get('/stats', (_req, res) => {
  const byStatus = all('SELECT status, COUNT(*) AS n FROM entries GROUP BY status ORDER BY n DESC');
  const bySection = all('SELECT section, COUNT(*) AS n FROM entries GROUP BY section');
  const edited = get('SELECT COUNT(*) AS n FROM entries WHERE edited = 1').n;
  const sources = get(`SELECT COUNT(*) AS n FROM entries WHERE sources IS NOT NULL AND sources != '[]'`).n;
  const rungCount = get("SELECT COUNT(*) AS n FROM entries WHERE kind = 'rung'").n;
  res.json({
    totals: { entries: get('SELECT COUNT(*) AS n FROM entries').n, sections: bySection.length, rungs: rungCount },
    rungCount,
    entries: get('SELECT COUNT(*) AS n FROM entries').n,
    sections: bySection.length,
    editedFromSeed: edited,
    withCitedSources: sources,
    byStatus,
    bySection,
    db: { bookmarks: get('SELECT COUNT(*) AS n FROM bookmarks').n, notes: get('SELECT COUNT(*) AS n FROM notes').n }
  });
});
