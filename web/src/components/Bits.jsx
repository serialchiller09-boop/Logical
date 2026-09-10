import { Link } from 'react-router-dom';

export const STATUS = {
  standard: { label: 'Standard-defined', cls: 'st-standard', blurb: 'Taken from a named standard or vendor instruction-set reference.' },
  practice: { label: 'Industry practice', cls: 'st-practice', blurb: 'Widely used and documented, but not codified in a single standard.' },
  vendor: { label: 'Vendor-specific', cls: 'st-vendor', blurb: 'Names/members depend on the platform and firmware revision - verify in your manual.' },
  'site-specific': { label: 'Site-specific', cls: 'st-site-specific', blurb: 'Meaning is set by YOUR plant documents. Confirm before acting.' },
  unverified: { label: 'Unverified', cls: 'st-unverified', blurb: 'Real and in use, but not checked against a primary source here. Treat as a lead.' },
  'illustrative-example': { label: 'Authored example', cls: 'st-illustrative-example', blurb: 'Written for this app to teach a pattern. Tags and numbers are invented placeholders.' }
};

export function StatusBadge({ status, showLabel = true, title = true }) {
  const s = STATUS[status] || STATUS.practice;
  return (
    <span className={`st ${s.cls}`} title={title ? `${s.label} - ${s.blurb}` : undefined}>
      {showLabel ? s.label : ''}
    </span>
  );
}

export function StatusLegend({ compact = false }) {
  const entries = Object.entries(STATUS);
  if (compact) {
    return (
      <div className="row">
        {entries.map(([k, v]) => <span key={k} className={`st ${v.cls}`} title={v.blurb}>{v.label}</span>)}
      </div>
    );
  }
  return (
    <dl className="kv">
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt><span className={`st ${v.cls}`}>{v.label}</span></dt>
          <dd>{v.blurb}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Provenance({ sources = [], status }) {
  const s = STATUS[status] || STATUS.practice;
  return (
    <div className="card">
      <div className="card-hd"><h3>Provenance</h3><StatusBadge status={status} /></div>
      <div className="card-bd stack">
        <p className="small muted" style={{ margin: 0 }}>{s.blurb}</p>
        {sources.length > 0 && (
          <div className="src">
            {sources.map((src, i) => (
              src?.url
                ? <a key={i} href={src.url} target="_blank" rel="noreferrer noopener">{src.label} ↗</a>
                : <span key={i}>{src?.label ?? String(src)}</span>
            ))}
          </div>
        )}
        <p className="tiny muted" style={{ margin: 0 }}>
          This reference explains definitions and patterns. It is not a design document: setpoints, limits,
          relief settings and any safety-related value must come from your plant specification, P&amp;ID legend,
          tag register, cause-and-effect matrix and vendor manuals.
        </p>
      </div>
    </div>
  );
}

export function BookmarkToggle({ id, marked, onToggle, small = false }) {
  return (
    <button
      type="button"
      className={`btn btn-sm ${small ? '' : 'btn-ghost'} ${marked ? 'btn-on' : ''}`}
      aria-pressed={!!marked}
      title={marked ? 'Remove from saved' : 'Save to your bookmark list'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle?.(id); }}
    >
      {marked ? '★ Saved' : '☆ Save'}
    </button>
  );
}

export function EntryCard({ entry, bookmarked, onToggleBookmark, query }) {
  const hl = (txt) => {
    if (!query || !txt) return txt;
    const i = txt.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return txt;
    return <>{txt.slice(0, i)}<mark>{txt.slice(i, i + query.length)}</mark>{txt.slice(i + query.length)}</>;
  };
  return (
    <Link className={`entry ${bookmarked ? 'is-bookmarked' : ''}`} to={`/e/${encodeURIComponent(entry.id)}`}>
      <span className="bm" aria-hidden>★</span>
      <div className="entry-t">
        <span>{hl(entry.title)}</span>
        {entry.kind === 'rung' && <span className="glyph" aria title="ladder rung">▤</span>}
      </div>
      {entry.subtitle ? <div className="entry-s">{hl(entry.subtitle)}</div> : null}
      {entry.body ? <div className="entry-b">{hl(entry.body)}</div> : null}
      <div className="entry-f">
        <StatusBadge status={entry.status} />
        {entry.edited && <span className="st st-site-specific" title="Edited from the shipped reference content">edited</span>}
        <span className="entry-tag" style={{ marginLeft: 'auto' }}>{entry.kind}</span>
        {onToggleBookmark && (
          <button
            type="button" className="btn btn-sm btn-ghost" style={{ padding: '2px 6px' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(entry.id); }}
            title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >{bookmarked ? '★' : '☆'}</button>
        )}
      </div>
    </Link>
  );
}

export function Loader({ label = 'loading' }) {
  return (
    <div className="row" style={{ padding: 24, color: 'var(--ink-3)' }}>
      <span className="spinner" /> <span className="small">{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="callout callout-bad">
      <h4>Request failed</h4>
      <div className="small">{String(error.message || error)}</div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="muted tiny">
          The API may not be running. In development start it with <code>npm run dev</code> at the repo root
          (Vite proxies <code>/api</code> to the Express server on port 8787).
        </span>
        {onRetry && <button className="btn btn-sm" onClick={onRetry}>Retry</button>}
      </div>
    </div>
  );
}
