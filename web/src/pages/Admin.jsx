import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getAdminToken, setAdminToken, useAsync } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { ErrorBox, Loader, StatusBadge, StatusLegend } from '../components/Bits.jsx';

const STATUSES = ['standard', 'practice', 'vendor', 'site-specific', 'unverified', 'illustrative-example'];

export default function Admin() {
  useTitle('Plant data');
  const { sections, toast } = useApp();
  const [sp, setSp] = useSearchParams();
  const [token, setToken] = useState(getAdminToken());
  const [denied, setDenied] = useState(false);
  const [section, setSection] = useState('');
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [text, setText] = useState('');
  const sel = sp.get('entry') || '';
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(() => api.admin.list(), [token]);
  const entries = data?.entries || [];

  const filtered = useMemo(() => entries.filter((e) => {
    if (section && e.section !== section) return false;
    if (onlyEdited && !e.edited) return false;
    if (text) {
      const t = text.toLowerCase();
      if (!(e.title.toLowerCase().includes(t) || e.id.toLowerCase().includes(t) || (e.subtitle || '').toLowerCase().includes(t))) return false;
    }
    return true;
  }), [entries, section, onlyEdited, text]);

  useEffect(() => {
    if (error?.status === 401) setDenied(true);
    else setDenied(false);
  }, [error]);

  const saveToken = async () => {
    setAdminToken(token.trim());
    setDenied(false);
    const ok = await api.admin.list().then(() => true).catch((e) => { if (e.status === 401) setDenied(true); return false; });
    if (ok) toast('admin token accepted', 'ok');
  };

  const reseed = async () => {
    if (!window.confirm('Re-apply the reference content from the source data modules?\n\nRows you edited or created (edited=1) are kept; everything else is replaced from source.')) return;
    setBusy(true);
    try {
      const r = await api.admin.reseed(true);
      toast(`reseeded: ${r.entries} reference entries, ${r.plantEntriesKept ?? 0} plant rows kept`, 'ok');
      reload();
    } catch (e) { toast(`reseed failed: ${e.message}`, 'bad'); } finally { setBusy(false); }
  };

  const exportJson = async () => {
    try {
      const r = await fetch('/api/admin/export', { headers: { 'x-admin-token': getAdminToken() } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'logical-entries.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('export downloaded', 'ok');
    } catch (e) { toast(`export failed: ${e.message}`, 'bad'); }
  };

  if (denied) {
    return (
      <div className="card" style={{ maxWidth: 620, margin: '30px auto' }}>
        <div className="card-hd"><h3>Plant-data access</h3></div>
        <div className="card-bd stack">
          <p className="small muted" style={{ margin: 0 }}>
            Editing is behind a token so that a shared install cannot be rewritten by whoever opens the browser.
            The server reads <span className="mono">ADMIN_TOKEN</span> from its environment; type that value here.
            It is stored only in this browser (localStorage) and sent as <span className="mono">x-admin-token</span>.
          </p>
          <input className="search-input" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN value" type="password" onKeyDown={(e) => e.key === 'Enter' && saveToken()} />
          {error && !loading && <div className="tiny" style={{ color: 'var(--bad)' }}>{error.message}{denied ? ' — that token was rejected.' : ''}</div>}
          <div className="row"><button className="btn btn-primary" onClick={saveToken}>Unlock</button>
            <span className="tiny muted">If the server has no ADMIN_TOKEN set, the default is documented in docs/ADMIN.md.</span></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>Plant data</h1>
        <p className="hero-lead">
          The reference content is version-controlled and read-only by design; this screen is where <i>your</i> answers
          live. Editing an entry flags it as <b>edited from reference</b> everywhere in the app, keeps a diff against the
          source text, and survives a reseed. That is the point: a plant convention worth recording should be visible as
          a deviation, not buried in the generic definition.
        </p>
        <div className="hero-meta">
          <span className="pill pill-accent"><b className="num">{entries.length}</b> entries</span>
          <span className="pill"><b className="num">{entries.filter((e) => e.edited).length}</b> edited by you</span>
          <button className="chip" onClick={() => setSp({ entry: 'new' })}>+ new plant entry</button>
          <button className="chip" onClick={reseed} disabled={busy}>{busy ? '…' : '⟳ re-apply from source'}</button>
          <button className="chip" onClick={exportJson}>⇩ export JSON</button>
        </div>
      </section>

      <div className="admin-grid" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-hd">
            <h3>Register</h3>
            <span className="hd-note">{filtered.length} shown</span>
          </div>
          <div className="card-bd">
            <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
              <input className="search-input" placeholder="filter by title or id" value={text} onChange={(e) => setText(e.target.value)} />
              <select className="search-input" style={{ maxWidth: 176 }} value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="">all sections</option>
                {sections.map((s) => <option key={s.slug} value={s.slug}>{s.label} ({s.total})</option>)}
              </select>
              <button className="chip" aria-pressed={onlyEdited} onClick={() => setOnlyEdited(!onlyEdited)}>only my edits</button>
            </div>
            {loading && <Loader label="loading register" />}
            <ErrorBox error={error && error.status !== 401 ? error : null} onRetry={reload} />
            <div className="admin-list">
              <div className="rowline head">
                <span>entry</span><span>section · kind</span><span>status</span><span>edited</span>
              </div>
              {filtered.slice(0, 400).map((e) => (
                <div className="rowline" key={e.id} style={{ cursor: 'pointer' }} onClick={() => setSp({ entry: e.id })}>
                  <Link to={`/e/${encodeURIComponent(e.id)}`} onClick={(ev) => ev.stopPropagation()}>
                    <b>{e.title}</b>
                    <div className="sub">{e.id}</div>
                  </Link>
                  <span className="tiny muted">{e.section}<br />{e.kind}</span>
                  <span><StatusBadge status={e.status} showLabel={false} /></span>
                  <span className="tiny" style={{ color: e.edited ? 'var(--warn)' : 'var(--ink-3)' }}>{e.edited ? 'yes' : '—'}</span>
                </div>
              ))}
              {filtered.length > 400 && <p className="tiny muted">showing the first 400 of {filtered.length} — narrow the filter.</p>}
            </div>
          </div>
        </div>

        {sel ? (
          <Editor id={sel === 'new' ? null : sel} sections={sections} onDone={() => { setSp({}); reload(); }} setDiff={setDiff} diff={diff} />
        ) : (
          <div className="card">
            <div className="card-hd"><h3>Editor</h3></div>
            <div className="card-bd stack">
              <p className="small muted" style={{ margin: 0 }}>Pick a row to edit it, or add a plant entry. Two rules keep this honest:</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                <li>Record what your plant decided and <i>where it says so</i> (tag register rev, spec clause, C&E matrix sheet). That is what makes the entry usable by the next person.</li>
                <li>Do not paste a standard’s text here. The reference keeps pointers to the document; the paid text stays in the document.</li>
              </ul>
              <div className="mini">status badges you can assign</div>
              <StatusLegend />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Editor({ id, sections, onDone, setDiff, diff }) {
  const { toast } = useApp();
  const isNew = !id;
  const { data, loading, error } = useAsync(id ? () => api.entry(id) : async () => null, [id]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm({ title: '', subtitle: '', body: '', status: 'site-specific', kind: 'plant-entry', section: sections[0]?.slug || '', tags: '', plantNote: '' });
    } else if (data?.entry) {
      const e = data.entry;
      setForm({
        title: e.title || '', subtitle: e.subtitle || '', body: e.body || '', status: e.status || 'practice',
        kind: e.kind || '', section: e.section || '', tags: (e.tags || []).join(', '),
        plantNote: e.payload?.plantNote || ''
      });
    }
  }, [data, isNew, sections]);

  useEffect(() => { setDiff(null); }, [id]);

  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target?.value ?? ev }));

  const loadDiff = async () => {
    try {
      const d = await api.admin.diff(id);
      setDiff(d);
    } catch (e) { toast(`diff failed: ${e.message}`, 'bad'); }
  };

  const save = async () => {
    setSaving(true);
    const patch = {
      title: form.title, subtitle: form.subtitle, body: form.body, status: form.status,
      kind: form.kind || 'plant-entry', section: form.section,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      plantNote: form.plantNote
    };
    try {
      if (isNew) await api.admin.create(patch);
      else await api.admin.update(id, patch);
      toast(isNew ? 'plant entry created' : 'saved — flagged as edited from reference', 'ok');
      onDone();
    } catch (e) { toast(`save failed: ${e.message}`, 'bad'); } finally { setSaving(false); }
  };

  const revert = async () => {
    if (!window.confirm('Revert this entry to the shipped reference text? Your plant edit will be discarded.')) return;
    try { await api.admin.revert(id); toast('reverted to reference content', 'ok'); onDone(); } catch (e) { toast(e.message, 'bad'); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this entry? Only entries created here can be deleted — reference content reverts instead.')) return;
    try { await api.admin.remove(id); toast('entry deleted', 'ok'); onDone(); } catch (e) { toast(e.message, 'bad'); }
  };

  if (loading) return <Loader label="opening entry" />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="card">
      <div className="card-hd">
        <h3>{isNew ? 'New plant entry' : 'Edit entry'}</h3>
        <span className="row" style={{ gap: 8 }}>
          {!isNew && <span className="mono tiny muted">{id}</span>}
          <Link className="btn btn-sm btn-ghost" to={isNew ? '/admin' : `/e/${encodeURIComponent(id)}`}>cancel</Link>
        </span>
      </div>
      <div className="card-bd stack">
        <label className="field"><span className="label">Title</span>
          <input className="search-input" value={form.title ?? ''} onChange={set('title')} placeholder="e.g. FV on our P&ID" /></label>
        <label className="field"><span className="label">Subtitle / one line</span>
          <input className="search-input" value={form.subtitle ?? ''} onChange={set('subtitle')} /></label>
        <label className="field"><span className="label">Body</span>
          <textarea className="note-area" value={form.body ?? ''} onChange={set('body')}
            placeholder="What is actually true at this plant, and the document that says so." /></label>

        <div className="grid-3">
          <label className="field"><span className="label">Section</span>
            <select className="search-input" value={form.section ?? ''} onChange={set('section')}>
              {sections.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
            </select></label>
          <label className="field"><span className="label">Kind</span>
            <input className="search-input" value={form.kind ?? ''} onChange={set('kind')} /></label>
          <label className="field"><span className="label">Provenance status</span>
            <select className="search-input" value={form.status ?? 'practice'} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
        </div>

        <label className="field"><span className="label">Tags (comma separated)</span>
          <input className="search-input" value={form.tags ?? ''} onChange={set('tags')} /></label>

        <label className="field"><span className="label">Plant note (stored on the entry, shown under a warning box)</span>
          <textarea className="note-area" style={{ minHeight: 70 }} value={form.plantNote ?? ''} onChange={set('plantNote')}
            placeholder="Deviation from the generic reference, with the document and revision it comes from." /></label>

        <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="row">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !form.title}>{saving ? 'saving…' : isNew ? 'Create entry' : 'Save edit'}</button>
            {!isNew && <button className="btn btn-sm btn-ghost" onClick={loadDiff}>diff vs source</button>}
            {!isNew && data?.entry?.edited && <button className="btn btn-sm btn-ghost" onClick={revert}>revert to reference</button>}
            {!isNew && data?.entry?.edited && <button className="btn btn-sm btn-ghost" onClick={remove}>delete…</button>}
          </div>
          {!isNew && !data?.entry?.edited && <span className="tiny muted">This row is still verbatim reference content — saving will flag it as edited.</span>}
        </div>

        {diff && (
          <div>
            <div className="mini">diff against the source data modules</div>
            {Object.keys(diff.differences || {}).length === 0 && <p className="small muted" style={{ margin: 0 }}>No differences — this row currently matches the seed text.</p>}
            {Object.entries(diff.differences || {}).map(([k, v]) => (
              <div className="diffrow" key={k}>
                <span className="lbl">{k}</span>
                <span className="seedv">{typeof v.seed === 'string' ? v.seed : JSON.stringify(v.seed)}</span>
                <span className="curv">{typeof v.current === 'string' ? v.current : JSON.stringify(v.current)}</span>
              </div>
            ))}
            <p className="tiny muted" style={{ marginTop: 6 }}>left: shipped reference · right: what your database holds now. Source of truth for the left column is{' '}
              <span className="mono">server/src/seed/*</span> under version control.</p>
          </div>
        )}
      </div>
    </div>
  );
}
