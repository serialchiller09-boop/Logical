import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useAsync, useDebounced } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { EntryCard, ErrorBox, Loader } from '../components/Bits.jsx';

const STATUSES = ['standard', 'practice', 'vendor', 'site-specific', 'unverified', 'illustrative-example'];

export default function Browse() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const kind = sp.get('kind') || '';
  const status = sp.get('status') || '';
  const q = sp.get('q') || '';
  const mode = sp.get('view') === 'list' ? 'list' : 'grid';
  const { sections, isMarked, toggleBookmark } = useApp();
  const section = sections.find((s) => s.slug === slug);
  useTitle(section?.label);

  const isSearch = !slug || slug === 'search';
  const searchQ = useDebounced(q, 200);

  const { data, loading, error, reload } = useAsync(() => {
    if (isSearch) return api.search(searchQ);
    return api.entries({ section: slug, kind, status, limit: 400 });
  }, [slug, kind, status, isSearch ? searchQ : '']);

  const set = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    setSp(next, { replace: true });
  };

  const entries = isSearch
    ? (data?.groups || []).flatMap((g) => g.entries.map((e) => ({ ...e, _group: g.label })))
    : (data?.entries || []);
  const total = isSearch ? (data?.total ?? 0) : (data?.total ?? data?.count ?? 0);

  return (
    <>
      {section && (
        <section className="hero" style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 30 }}>{section.icon} {section.label}</h1>
          <p className="hero-lead" style={{ maxWidth: 900 }}>{section.blurb}</p>
          {section.long && <p className="small muted" style={{ maxWidth: 900, margin: '8px 0 0' }}>{section.long}</p>}
          <div className="hero-meta">
            <span className="pill pill-accent"><b className="num">{section.total}</b> entries</span>
            {Object.entries(section.statusBreakdown || {}).map(([k, v]) => (
              <button key={k} className="chip" aria-pressed={status === k} style={{ padding: 0, border: 0, background: 'none' }}
                title={`show only ${k}`} onClick={() => set('status', status === k ? '' : k)}>
                <span className={`st st-${k}`}>{k.replace('illustrative-example', 'authored example')} · {v}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isSearch && (
        <section className="hero" style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 30 }}>Search{q ? `: “${q}”` : ''}</h1>
          <p className="hero-lead">{data ? `${total} entries match` : 'Type at least two characters.'}</p>
        </section>
      )}

      <div className="card" style={{ marginTop: isSearch ? 14 : 16 }}>
        <div className="filters">
          {isSearch ? (
            <input className="search-input" autoFocus defaultValue={q} placeholder="every field, all sections - try 'stiction', 'OTL', 'amine', 'Td'"
              onChange={(e) => set('q', e.target.value)} />
          ) : (
            <span className="muted small" style={{ marginRight: 4 }}>Filter by kind:</span>
          )}

          {section && Object.entries(section.kinds || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <button key={k} className="chip" aria-pressed={kind === k} onClick={() => set('kind', kind === k ? '' : k)}>{k} <span className="n">{n}</span></button>
          ))}

          {status && <button className="chip" aria-pressed onClick={() => set('status', '')}>status: {status} ✕</button>}
          {kind && !section && <button className="chip" aria-pressed onClick={() => set('kind', '')}>kind: {kind} ✕</button>}

          <span className="row" style={{ marginLeft: 'auto', gap: 6 }}>
            <span className="tiny muted">{total} result{total === 1 ? '' : 's'}</span>
            <button className="chip" aria-pressed={mode === 'list'} onClick={() => set('view', mode === 'list' ? '' : 'list')}>
              {mode === 'list' ? '▤ list' : '▦ cards'}
            </button>
          </span>
        </div>

        <div className="card-bd">
          {loading && <Loader label="reading the index" />}
          <ErrorBox error={error} onRetry={reload} />
          {!loading && !error && entries.length === 0 && (
            <div className="empty">
              <b>Nothing here yet</b>
              <p className="muted small">No entry matches that combination of section, kind and status. Clear a filter, or add the plant-specific answer yourself in{' '}
                <Link to="/admin">plant data</Link> — that is what the editor is for.</p>
            </div>
          )}
          {!loading && entries.length > 0 && (
            <div className={`entry-grid ${mode === 'list' ? 'list' : ''}`}>
              {entries.map((e) => (
                <EntryCard key={e.id} entry={e} query={isSearch ? searchQ : ''} bookmarked={isMarked(e.id)} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )}
          {isSearch && data?.groups?.length > 0 && mode !== 'list' && (
            <p className="tiny muted" style={{ margin: '14px 0 0' }}>
              Results are ranked: an exact title match outranks a mention deep in a table. The badge tells you how much weight the hit carries.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
