import { Router } from 'express';
import { all, get, run, hydrate } from '../db.js';

/* ------------------------------------------------- personal state: bookmarks, notes, recents */
export const stateRouter = Router();

stateRouter.get('/state', (_req, res) => {
  res.json({
    bookmarks: all('SELECT entry_id, created_at FROM bookmarks ORDER BY created_at DESC').map(hydrate),
    notes: all('SELECT entry_id, body, updated_at FROM notes ORDER BY updated_at DESC').map(hydrate),
    recents: all('SELECT entry_id, viewed_at, views FROM recents ORDER BY viewed_at DESC LIMIT 20').map(hydrate)
  });
});

const bookmarkIds = () => all('SELECT entry_id FROM bookmarks ORDER BY created_at DESC').map((r) => r.entry_id);

stateRouter.get('/bookmarks', (_req, res) => {
  const rows = all(`
    SELECT e.id, e.section, e.kind, e.title, e.subtitle, e.status, e.tags, e.edited, b.created_at AS saved_at
    FROM bookmarks b JOIN entries e ON e.id = b.entry_id
    ORDER BY b.created_at DESC`);
  res.json({ entries: rows.map(hydrate), ids: bookmarkIds() });
});

stateRouter.get('/recents', (_req, res) => {
  const rows = all(`
    SELECT e.id, e.section, e.kind, e.title, e.subtitle, e.status, r.viewed_at, r.views
    FROM recents r JOIN entries e ON e.id = r.entry_id
    ORDER BY r.viewed_at DESC LIMIT 24`);
  res.json({ entries: rows.map(hydrate) });
});

stateRouter.put('/bookmarks/:id', (req, res) => {
  if (!get('SELECT id FROM entries WHERE id = ?', [req.params.id])) {
    return res.status(404).json({ error: 'Unknown entry' });
  }
  run('INSERT OR IGNORE INTO bookmarks (entry_id) VALUES (?)', [req.params.id]);
  res.json({ ok: true, bookmarked: true, id: req.params.id, ids: bookmarkIds() });
});

stateRouter.delete('/bookmarks/:id', (req, res) => {
  run('DELETE FROM bookmarks WHERE entry_id = ?', [req.params.id]);
  res.json({ ok: true, bookmarked: false, id: req.params.id, ids: bookmarkIds() });
});

stateRouter.get('/notes/:id', (req, res) => {
  res.json(get('SELECT entry_id, body, updated_at FROM notes WHERE entry_id = ?', [req.params.id]) ?? { entry_id: req.params.id, body: '' });
});

stateRouter.put('/notes/:id', (req, res) => {
  const body = String(req.body?.body ?? '');
  if (!get('SELECT id FROM entries WHERE id = ?', [req.params.id])) {
    return res.status(404).json({ error: 'Unknown entry' });
  }
  if (!body.trim()) {
    run('DELETE FROM notes WHERE entry_id = ?', [req.params.id]);
    return res.json({ ok: true, cleared: true });
  }
  run(`INSERT INTO notes (entry_id, body, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(entry_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    [req.params.id, body]);
  res.json({ ok: true, entry_id: req.params.id, body, updated_at: get('SELECT updated_at FROM notes WHERE entry_id = ?', [req.params.id]).updated_at });
});

stateRouter.post('/recents/:id', (req, res) => {
  if (!get('SELECT id FROM entries WHERE id = ?', [req.params.id])) {
    return res.status(404).json({ error: 'Unknown entry' });
  }
  run(`INSERT INTO recents (entry_id, viewed_at, views) VALUES (?, datetime('now'), 1)
       ON CONFLICT(entry_id) DO UPDATE SET viewed_at = datetime('now'), views = views + 1`,
    [req.params.id]);
  res.json({ ok: true });
});

stateRouter.delete('/recents', (_req, res) => {
  run('DELETE FROM recents');
  res.json({ ok: true });
});

/* ------------------------------------------------- admin: content CRUD (plant-specific edits) */
export const adminRouter = Router();

const EDITABLE = ['title', 'subtitle', 'body', 'status', 'kind', 'section'];

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || 'logical-admin';
  const given = req.header('x-admin-token');
  if (!given || given !== expected) {
    return res.status(401).json({
      error: 'Admin token required',
      hint: "Set ADMIN_TOKEN for the server process and send it as the 'x-admin-token' header. See docs/ADMIN.md."
    });
  }
  next();
}

adminRouter.use('/admin', requireAdmin);

adminRouter.get('/admin/entries', (req, res) => {
  const rows = all(`SELECT id,section,kind,title,subtitle,status,edited,updated_at,
                     (SELECT length(payload) FROM entries e2 WHERE e2.id = entries.id) AS payload_bytes
                    FROM entries ORDER BY edited DESC, section, title COLLATE NOCASE`);
  res.json({ entries: rows.map(hydrate), editableFields: EDITABLE });
});

adminRouter.put('/admin/entries/:id', (req, res) => {
  const existing = get('SELECT * FROM entries WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Unknown entry' });

  const patch = req.body ?? {};
  const fields = [];
  const params = [];
  for (const f of EDITABLE) {
    if (f in patch) { fields.push(`${f} = ?`); params.push(patch[f] ?? ''); }
  }
  if ('tags' in patch) { fields.push('tags = ?'); params.push(JSON.stringify(patch.tags ?? [])); }
  if ('sources' in patch) { fields.push('sources = ?'); params.push(JSON.stringify(patch.sources ?? [])); }
  if ('payload' in patch) { fields.push('payload = ?'); params.push(JSON.stringify(patch.payload ?? {})); }

  if (!fields.length) return res.status(400).json({ error: 'No editable fields supplied', editable: [...EDITABLE, 'tags', 'sources', 'payload'] });

  fields.push('edited = 1', "updated_at = datetime('now')");
  run(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`, [...params, req.params.id]);

  // a note in the payload marks WHY the plant differs from the generic reference
  if (typeof patch.plantNote === 'string') {
    const payload = safeJson(existing.payload, {});
    payload.plantNote = patch.plantNote;
    run('UPDATE entries SET payload = ? WHERE id = ?', [JSON.stringify(payload), req.params.id]);
  }
  res.json({ ok: true, entry: hydrate(get('SELECT * FROM entries WHERE id = ?', [req.params.id])) });
});

adminRouter.post('/admin/entries', (req, res) => {
  const b = req.body ?? {};
  if (!b.section || !b.title) return res.status(400).json({ error: 'section and title are required' });
  if (!get('SELECT slug FROM sections WHERE slug = ?', [b.section])) return res.status(400).json({ error: `Unknown section: ${b.section}` });
  const id = String(b.id ?? `${b.section}:plant:${String(b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).trim();
  if (get('SELECT id FROM entries WHERE id = ?', [id])) return res.status(409).json({ error: 'Entry id already exists', id });

  const tags = Array.isArray(b.tags) ? b.tags : [];
  const sources = Array.isArray(b.sources) ? b.sources : [];
  const payload = b.payload && typeof b.payload === 'object' ? { ...b.payload } : {};
  if (typeof b.plantNote === 'string' && b.plantNote.trim()) payload.plantNote = b.plantNote.trim();
  const search = [id, b.section, b.kind ?? '', b.title, b.subtitle ?? '', b.body ?? '', tags.join(' ')].join(' \u2022 ').toLowerCase();

  run(`INSERT INTO entries (id,section,kind,title,subtitle,body,status,tags,sources,payload,search,edited)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
    [id, b.section, b.kind ?? 'plant-entry', b.title, b.subtitle ?? '', b.body ?? '',
      b.status ?? 'site-specific', JSON.stringify(tags), JSON.stringify(sources), JSON.stringify(payload), search]);

  res.status(201).json({ ok: true, entry: hydrate(get('SELECT * FROM entries WHERE id = ?', [id])) });
});

adminRouter.delete('/admin/entries/:id', (req, res) => {
  const e = get('SELECT id, edited FROM entries WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).json({ error: 'Unknown entry' });
  if (!e.edited) return res.status(400).json({ error: 'Seeded content is not deletable - revert it instead. Only entries you created can be deleted.', id: e.id });
  run('DELETE FROM entries WHERE id = ?', [req.params.id]);
  res.json({ ok: true, deleted: req.params.id });
});

/** Show what the authored seed says vs what the database currently says. */
adminRouter.get('/admin/diff/:id', async (req, res) => {
  const current = get('SELECT * FROM entries WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Unknown entry' });
  const { buildEntries } = await import('../seed/index.js');
  const seedEntry = buildEntries().find((e) => e.id === req.params.id) ?? null;
  const diff = {};
  for (const f of [...EDITABLE, 'tags', 'sources']) {
    const a = seedEntry ? norm(seedEntry[f]) : null;
    const b = norm(current[f]);
    if (a !== b) diff[f] = { seed: seedEntry?.[f] ?? '(not in seed)', current: f === 'tags' || f === 'sources' ? JSON.parse(b || 'null') : current[f] };
  }
  res.json({ id: req.params.id, inSeed: !!seedEntry, edited: !!current.edited, differences: diff });
});

adminRouter.post('/admin/revert/:id', async (req, res) => {
  const { buildEntries } = await import('../seed/index.js');
  const seedEntry = buildEntries().find((e) => e.id === req.params.id);
  if (!seedEntry) return res.status(400).json({ error: 'Not in seed; cannot revert. Delete it instead.' });
  run(`UPDATE entries SET section=?, kind=?, title=?, subtitle=?, body=?, status=?, tags=?, sources=?, payload=?, search=?, edited=0, updated_at=datetime('now') WHERE id=?`,
    [seedEntry.section, seedEntry.kind, seedEntry.title, seedEntry.subtitle, seedEntry.body, seedEntry.status,
      JSON.stringify(seedEntry.tags), JSON.stringify(seedEntry.sources), JSON.stringify(seedEntry.payload), seedEntry.search, seedEntry.id]);
  res.json({ ok: true, reverted: seedEntry.id });
});

adminRouter.post('/admin/reseed', async (req, res) => {
  const { seed } = await import('../db.js');
  const result = await seed({ force: req.body?.force !== false });
  res.json({ ok: true, ...result, note: 'Content re-applied from source. Bookmarks and notes were preserved.' });
});

adminRouter.get('/admin/export', (_req, res) => {
  const rows = all('SELECT * FROM entries ORDER BY section, title');
  res.setHeader('content-disposition', 'attachment; filename="logical-entries.json"');
  res.json({ exportedAt: new Date().toISOString(), count: rows.length, entries: rows.map(hydrate) });
});

function norm(v) {
  if (v == null) return '';
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function safeJson(str, fallback) { try { return JSON.parse(str); } catch { return fallback; } }
