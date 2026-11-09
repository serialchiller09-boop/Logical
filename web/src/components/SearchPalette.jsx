import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useDebounced } from '../lib/api.js';
import { notebookPageHref, searchNotebookPages } from '../lib/controlsNotebook.js';
import { useControlsNotebookIndex } from '../lib/useControlsNotebook.js';

export function SearchPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState(false);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef(null);
  const dq = useDebounced(q, 160);
  const searching = open && dq.trim().length >= 2;
  const { index, loading: notebookLoading, error: notebookError, retry } = useControlsNotebookIndex(searching);
  const notebookHits = useMemo(() => searching ? searchNotebookPages(index, dq.trim()) : [], [index, dq, searching]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setSel(0);
    if (dq.trim().length < 2) { setData(null); setReferenceLoading(false); setReferenceError(false); return undefined; }
    setData(null);
    setReferenceLoading(true);
    setReferenceError(false);
    api.search(dq.trim()).then(
      (result) => { if (alive) { setData(result); setReferenceLoading(false); } },
      () => { if (alive) { setData(null); setReferenceLoading(false); setReferenceError(true); } }
    );
    return () => { alive = false; };
  }, [dq, open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => { if (open) setQ(''); }, [open]);

  const rows = useMemo(() => {
    const reference = (data?.groups || []).flatMap((group) => group.entries.map((entry) => ({
      key: `entry:${entry.id}`, href: `/e/${encodeURIComponent(entry.id)}`
    })));
    const manual = notebookHits.slice(0, 5).map((hit) => ({
      key: `notebook:${hit.page}`, href: notebookPageHref(hit.page, dq.trim())
    }));
    return [...reference, ...manual];
  }, [data, notebookHits, dq]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); setSel((s) => Math.min(s + 1, Math.max(0, rows.length - 1))); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      if (event.key === 'Enter' && rows[sel]) { event.preventDefault(); nav(rows[sel].href); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rows, sel, nav, onClose]);

  if (!open) return null;

  const noHits = searching && !referenceLoading && !notebookLoading && !referenceError && !notebookError && rows.length === 0;
  return (
    <div className="palette-scrim" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="palette-in">
          <span aria-hidden="true">⌕</span>
          <input ref={input} value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search reference entries and controls notebook"
            placeholder="search tags, ladder instructions, notebook pages, safety…" />
          {data && <span className="badge-num">{data.total} entries</span>}
        </div>

        {q.trim().length < 2 && (
          <div className="pal-hint" style={{ display: 'block' }}>
            <div style={{ padding: '10px 14px' }}>
              <div className="small muted" style={{ marginBottom: 8 }}>Search curated entries and the supplied controls notebook. Notebook hits open the original PDF page.</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {['surge', 'seal-in', 'HART', 'fail-safe', 'amine', 'OTL', 'SIL', '4-20', 'FLEX I/O'].map((term) => (
                  <button key={term} className="chip" onClick={() => setQ(term)}>{term}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {noHits && <div className="pal-hint"><span>no matches — try a shorter word, or a tag letter</span></div>}
        {searching && referenceError && <div className="pal-hint">Reference search is unavailable; notebook pages may still be searched.</div>}
        {searching && notebookError && <div className="pal-hint">Notebook search is unavailable. <button className="inline-action" onClick={retry}>Try again</button></div>}

        <div className="palette-body" role="listbox" aria-label="Search results">
          {(data?.groups || []).map((group) => (
            <div key={group.section}>
              <div className="pal-sec">{group.label} · {group.count}</div>
              {group.entries.map((entry) => {
                const i = rows.findIndex((row) => row.key === `entry:${entry.id}`);
                return (
                  <button key={entry.id} className="pal-row" role="option" aria-selected={i === sel}
                    onMouseEnter={() => setSel(i)} onClick={() => { nav(rows[i].href); onClose(); }}>
                    <span>{entry.title}</span>
                    <span className="pal-s">{entry.subtitle || entry.kind}</span>
                    <span className={`st st-${entry.status}`}>{(entry.status || '').replace('illustrative-example', 'example')}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {notebookHits.length > 0 && <div>
            <div className="pal-sec">Controls notebook · {notebookHits.length} page{notebookHits.length === 1 ? '' : 's'} · original source</div>
            {notebookHits.slice(0, 5).map((hit) => {
              const i = rows.findIndex((row) => row.key === `notebook:${hit.page}`);
              return <button key={hit.page} className="pal-row" role="option" aria-selected={i === sel}
                onMouseEnter={() => setSel(i)} onClick={() => { nav(rows[i].href); onClose(); }}>
                <span className="manual-result-page">p. {hit.page}</span>
                <span className="pal-s">{hit.label}</span>
                <span className="st st-illustrative-example">source PDF</span>
              </button>;
            })}
          </div>}
        </div>

        {rows.length > 0 && (
          <div className="pal-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>esc</kbd> close</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { nav(`/s/search?q=${encodeURIComponent(dq.trim())}`); onClose(); }}>full results ↗</button>
          </div>
        )}
      </div>
    </div>
  );
}
