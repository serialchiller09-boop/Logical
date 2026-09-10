import { Link } from 'react-router-dom';
import { api, useAsync } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { EntryCard, ErrorBox, Loader, StatusBadge } from '../components/Bits.jsx';

export default function Saved() {
  useTitle('My list');
  const { isMarked, toggleBookmark, toast } = useApp();
  const { data, loading, error, reload } = useAsync(async () => {
    const [bm, state] = await Promise.all([api.state.bookmarks(), api.state.all()]);
    return { bm, state };
  }, []);

  const notes = data?.state?.notes || [];
  const entriesById = new Map((data?.bm?.entries || []).map((e) => [e.id, e]));
  const recents = data?.state?.recents || [];

  const clearRecents = async () => {
    await api.state.clearRecents();
    toast('recent list cleared', 'ok');
    reload();
  };

  return (
    <>
      <section className="hero">
        <h1>My list</h1>
        <p className="hero-lead">
          Bookmarks, notes and what you opened recently. This lives in the SQLite file next to the API
          (<span className="mono tiny">server/data/logical.db</span>) and survives reseeding of the reference content —
          it is deliberately kept out of the shipped data so your working record is never overwritten by an update.
        </p>
        <div className="hero-meta">
          <span className="pill pill-accent"><b className="num">{data?.bm?.entries?.length ?? 0}</b> saved</span>
          <span className="pill"><b className="num">{notes.length}</b> notes</span>
          <span className="pill"><b className="num">{recents.length}</b> recent</span>
        </div>
      </section>

      {loading && <Loader label="reading your list" />}
      <ErrorBox error={error} onRetry={reload} />

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-hd"><h3>Saved entries</h3><span className="hd-note">the ones worth having on a round</span></div>
        <div className="card-bd">
          {!data?.bm?.entries?.length ? (
            <div className="empty">
              <b>Nothing saved yet</b>
              <p className="small muted">Use ☆ on any card, or ★ on an entry page. Bookmarking is also the way to build a
                printed set: save what you need, then print the list.</p>
            </div>
          ) : (
            <div className="entry-grid">
              {data.bm.entries.map((e) => (
                <EntryCard key={e.id} entry={{ ...e, body: '' }} bookmarked={isMarked(e.id)} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-hd"><h3>Notes</h3><span className="hd-note">per entry, editable from the entry page</span></div>
          <div className="card-bd stack">
            {!notes.length && <p className="small muted" style={{ margin: 0 }}>No notes yet. On any entry, write what your plant does and save — ⌘/Ctrl+Enter.</p>}
            {notes.map((nr) => {
              const e = entriesById.get(nr.entry_id);
              return (
                <div className="io-cell" key={nr.entry_id} style={{ display: 'block' }}>
                  <div className="row spread">
                    <Link className="mono" style={{ color: '#fff', fontWeight: 600, fontSize: 12.5 }} to={`/e/${encodeURIComponent(nr.entry_id)}`}>
                      {e?.title || nr.entry_id}
                    </Link>
                    <span className="tiny muted">{nr.updated_at}</span>
                  </div>
                  <div className="small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{nr.body}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <h3>Recently opened</h3>
            {recents.length > 0 && <button className="btn btn-sm btn-ghost" onClick={clearRecents}>clear</button>}
          </div>
          <div className="card-bd">
            {!recents.length ? (
              <p className="small muted" style={{ margin: 0 }}>Nothing yet — the last 20 entries you open show up here.</p>
            ) : (
              <div className="stack" style={{ gap: 2 }}>
                {recents.map((r) => (
                  <div className="rowline" key={r.entry_id}>
                    <Link to={`/e/${encodeURIComponent(r.entry_id)}`}>
                      <b>{r.title || r.entry_id}</b>
                      <div className="sub">{r.entry_id}</div>
                    </Link>
                    <span className="tiny muted">{r.viewed_at}</span>
                    <span className="tiny muted">{r.views}×</span>
                    <span className="tiny muted">{r.section}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="tiny muted" style={{ margin: '12px 0 0' }}>
              Recent rows are keyed by entry id. If the reference content is reseeded and an id disappears, the row is
              dropped rather than left dangling — your saved list is never silently rewritten.
            </p>
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="callout callout-info" style={{ marginTop: 14 }}>
          <h4>Notes are not citations</h4>
          <div>
            A note records what you checked and where — that is what makes it usable at 2am. It does not change the
            reference entry, and it does not make a plant convention into a standard. If the plant answer should apply
            to everyone using this install, record it as a{' '}
            <Link to={`/admin?entry=${encodeURIComponent(notes[0].entry_id)}`}>plant-data edit</Link> so the entry itself carries the badge and the diff.
          </div>
        </div>
      )}
    </>
  );
}
