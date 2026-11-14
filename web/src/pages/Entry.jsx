import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useAsync } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { BookmarkToggle, ErrorBox, Loader, Provenance, StatusBadge } from '../components/Bits.jsx';
import { Fields } from '../components/Fields.jsx';
import { RungSimulator } from '../components/RungDiagram.jsx';
import { RELATED_CONTROLS_READING } from '../data/controlsNotebook.js';
import { notebookPageHref } from '../lib/controlsNotebook.js';

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
          className="note-area" value={body} placeholder="Plant-specific note for this entry (local SQLite only)."
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }}
        />
        <div className="row spread" style={{ marginTop: 8 }}>
          <span className="tiny muted">⌘/Ctrl+Enter saves.</span>
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
  const { isMarked, toggleBookmark } = useApp();
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
  const goal = entry.payload?.goal || (hasRung ? entry.subtitle : '');
  const tryThis = Array.isArray(entry.payload?.tryThis) ? entry.payload.tryThis : [];

  return (
    <>
      <div className="detail-head">
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="crumbs">
            <Link to={`/s/${entry.section}`}>{data.section?.label ?? entry.section}</Link>
            <span>/</span>
            <span>{hasRung ? 'lab' : entry.kind}</span>
          </div>
          <div className="row" style={{ gap: 7 }}>
            <BookmarkToggle id={entry.id} marked={marked} onToggle={toggleBookmark} />
            <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>⎙ print</button>
            {!hasRung && (
              <Link className="btn btn-sm btn-ghost" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>✎ record plant answer</Link>
            )}
          </div>
        </div>

        <h1 className="detail-title">{entry.title}</h1>
        {hasRung ? (
          goal && <p className="sim-goal-line">{goal}</p>
        ) : (
          entry.subtitle && <p className="detail-sub">{entry.subtitle}</p>
        )}
        {!hasRung && (
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 7 }}>
            <StatusBadge status={entry.status} />
            {entry.edited && <span className="st st-site-specific" title="This entry has been changed from the shipped reference content — the diff is in plant data.">edited from reference</span>}
            {(entry.tags || []).map((t) => (
              <Link key={t} className="pill" to={`/s/search?q=${encodeURIComponent(t)}`}>{t}</Link>
            ))}
          </div>
        )}
      </div>

      {hasRung ? (
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {tryThis.length > 0 && (
            <ol className="try-steps">
              {tryThis.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          )}

          <RungSimulator entry={entry} compact />

          <details className="more-detail">
            <summary>More detail (how to read it, gotchas, provenance)</summary>
            <div className="stack" style={{ gap: 14, marginTop: 12 }}>
              {entry.body && (
                <div className="card">
                  <div className="card-bd">
                    <div className="prose" style={{ marginTop: 0 }}>
                      {String(entry.body).split('\n').map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                  </div>
                </div>
              )}
              <Fields entry={entry} />
              <Provenance sources={entry.sources} status={entry.status} />
              <NoteEditor id={entry.id} initial={data.note?.body || ''} />
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <Link className="pill" to="/s/rungs">all ladder lab</Link>
                <Link className="pill" to="/s/instructions">ladder elements</Link>
                <Link className="pill" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>plant answer</Link>
              </div>
            </div>
          </details>
        </div>
      ) : (
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
            <Fields entry={entry} />
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
                  {entry.section === 'pid' && <Link className="pill" to="/tools">Kc / PB workbench</Link>}
                  {RELATED_CONTROLS_READING[entry.section] && <Link className="pill" to={notebookPageHref(RELATED_CONTROLS_READING[entry.section].page)}>related notebook reading</Link>}
                  <Link className="pill" to={`/s/search?q=${encodeURIComponent(entry.title)}`}>find mentions of this</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="pager">
        {data.prev ? <Link to={`/e/${encodeURIComponent(data.prev.id)}`}>← {data.prev.title}</Link> : <span />}
        {data.next ? <Link style={{ textAlign: 'right' }} to={`/e/${encodeURIComponent(data.next.id)}`}>{data.next.title} →</Link> : <span />}
      </div>
    </>
  );
}
