import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useAsync } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { BookmarkToggle, ErrorBox, Loader, Provenance, StatusBadge } from '../components/Bits.jsx';
import { Fields } from '../components/Fields.jsx';
import { RungSimulator } from '../components/RungDiagram.jsx';

function NoteEditor({ id, initial = '' }) {
  const [body, setBody] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();

  useEffect(() => { setBody(initial); setSaved(initial); }, [initial, id]);
  const dirty = body !== saved;

  const save = async () => {
    setBusy(true);
    try {
      await api.state.saveNote(id, body);
      setSaved(body);
      toast(body.trim() ? 'note saved on this device' : 'note cleared', 'ok');
    } catch (e) { toast(`could not save note: ${e.message}`, 'bad'); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Your note</h3>
        <span className="hd-note">{dirty ? 'unsaved' : saved ? 'saved' : 'private to this install'}</span>
      </div>
      <div className="card-bd">
        <textarea
          className="note-area" value={body} placeholder="What your plant actually does with this — the answer from the tag register, the spec clause, the panel you found it in. Notes stay in the local SQLite file, never in the shipped reference data."
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }}
        />
        <div className="row spread" style={{ marginTop: 8 }}>
          <span className="tiny muted">⌘/Ctrl+Enter saves. This is your working record, not something the reference claims.</span>
          <span className="row">
            {saved && <button className="btn btn-sm btn-ghost" onClick={() => { setBody(''); }}>clear</button>}
            <button className="btn btn-sm btn-primary" onClick={save} disabled={!dirty || busy}>{busy ? '…' : 'Save note'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EntryPage() {
  const { id } = useParams();
  const { isMarked, toggleBookmark, toast } = useApp();
  const { data, loading, error, reload } = useAsync(() => api.entry(id), [id]);
  const entry = data?.entry;
  useTitle(entry?.title);

  useEffect(() => { if (id) api.state.seen(id).catch(() => {}); }, [id]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (loading) return <Loader label="opening entry" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!entry) return <div className="empty"><b>not found</b></div>;

  const hasRung = !!entry.payload?.ladder;
  const marked = isMarked(entry.id);
  const extraRungs = Object.keys(entry.payload || {}).filter((k) => entry.payload[k]?.ladder && k !== 'ladder');

  return (
    <>
      <div className="detail-head">
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="crumbs">
            <Link to={`/s/${entry.section}`}>{data.section?.label ?? entry.section}</Link>
            <span>/</span>
            <span>{entry.kind}</span>
            <span>/</span>
            <span className="mono" style={{ color: 'var(--ink-3)' }}>{entry.id}</span>
          </div>
          <div className="row" style={{ gap: 7 }}>
            <BookmarkToggle id={entry.id} marked={marked} onToggle={toggleBookmark} />
            <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>⎙ print</button>
            <Link className="btn btn-sm btn-ghost" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>✎ record plant answer</Link>
          </div>
        </div>

        <h1 className="detail-title">{entry.title}</h1>
        {entry.subtitle && <p className="detail-sub">{entry.subtitle}</p>}
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 7 }}>
          <StatusBadge status={entry.status} />
          {entry.edited && <span className="st st-site-specific" title="This entry has been changed from the shipped reference content — the diff is in plant data.">edited from reference</span>}
          {(entry.tags || []).map((t) => (
            <Link key={t} className="pill" to={`/s/search?q=${encodeURIComponent(t)}`}>{t}</Link>
          ))}
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {entry.body && (
            <div className="card">
              <div className="card-bd">
                <div className="prose" style={{ marginTop: 0 }}>
                  {String(entry.body).split('\n').map((l, i) => <p key={i}>{l}</p>)}
                </div>
              </div>
            </div>
          )}

          {hasRung && (
            <>
              <RungSimulator entry={entry} />
              {entry.payload.gotchas && (
                <div className="callout callout-warn">
                  <h4>What this pattern hides</h4>
                  <ul>{[].concat(entry.payload.gotchas).map((g, i) => <li key={i}>{g}</li>)}</ul>
                </div>
              )}
            </>
          )}

          <Fields entry={entry} />

          {hasRung && extraRungs.length > 0 && (
            <div className="callout callout-info">
              <h4>Second rung{extraRungs.length > 1 ? 's' : ''} in this example</h4>
              <div className="small">{extraRungs.map((k) => entry.payload[k]?.note || k).join(' · ')}</div>
              <div className="tiny muted" style={{ marginTop: 6 }}>The simulator steps the rungs in order, sharing one I/O image, exactly as a real program would across consecutive rungs.</div>
            </div>
          )}
        </div>

        <aside className="stack" style={{ gap: 14 }}>
          <Provenance sources={entry.sources} status={entry.status} />
          <NoteEditor id={entry.id} initial={data.note?.body || ''} />

          <div className="card">
            <div className="card-hd"><h3>Jump to</h3></div>
            <div className="card-bd">
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <Link className="pill" to={`/s/${entry.section}`}>all {data.section?.label ?? entry.section}</Link>
                {entry.section === 'isa-letters' && <Link className="pill" to="/tools">tag decoder</Link>}
                {entry.section === 'rungs' && <Link className="pill" to="/s/instructions">ladder elements</Link>}
                {entry.section === 'pid' && <Link className="pill" to="/tools">Kc / PB workbench</Link>}
                <Link className="pill" to={`/s/search?q=${encodeURIComponent(entry.title)}`}>find mentions of this</Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="pager">
        {data.prev ? <Link to={`/e/${encodeURIComponent(data.prev.id)}`}>← {data.prev.title}</Link> : <span />}
        {data.next ? <Link style={{ textAlign: 'right' }} to={`/e/${encodeURIComponent(data.next.id)}`}>{data.next.title} →</Link> : <span />}
      </div>
    </>
  );
}
