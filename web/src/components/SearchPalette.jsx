import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useDebounced } from '../lib/api.js';

export function SearchPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef(null);
  const dq = useDebounced(q, 160);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setSel(0);
    if (dq.trim().length < 2) { setData(null); return; }
    api.search(dq.trim()).then((r) => { if (alive) setData(r); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [dq, open]);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 30); }, [open]);
  useEffect(() => { if (open) setQ(''); }, [open]);

  const rows = useMemo(() => (data?.groups || []).flatMap((g) => g.entries.map((e) => ({ ...e, section: g.label })) || []), [data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, rows.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      if (e.key === 'Enter' && rows[sel]) { e.preventDefault(); nav(`/e/${encodeURIComponent(rows[sel].id)}`); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rows, sel, nav, onClose]);

  if (!open) return null;

  return (
    <div className="palette-scrim" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-in">
          <span aria-hidden>⌕</span>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="search every entry: tags, mnemonics, defects, tuning, ISA-5.1, amine, SOHV…" />
          {data && <span className="badge-num">{data.total} hits</span>}
        </div>

        {q.trim().length < 2 && (
          <div className="pal-hint" style={{ display: 'block' }}>
            <div style={{ padding: '10px 14px' }}>
              <div className="small muted" style={{ marginBottom: 8 }}>Two or more characters. Every entry carries a provenance badge, so a search result tells you how much to trust it.</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {['surge', 'seal-in', 'Kc = 100', 'fail-safe', 'amine', 'OTL', 'psia', 'SIL', '4-20', 'SOHV'].map((t) => (
                  <button key={t} className="chip" onClick={() => setQ(t)}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {rows.length === 0 && q.trim().length >= 2 && (
          <div className="pal-hint"><span>no matches — try a shorter word, or a tag letter</span></div>
        )}

        <div className="palette-body" role="listbox">
          {(data?.groups || []).map((g) => (
            <div key={g.slug}>
              <div className="pal-sec">{g.label} · {g.count}</div>
              {g.entries.map((e) => {
                const i = rows.findIndex((r) => r.id === e.id);
                return (
                  <button key={e.id} className="pal-row" role="option" aria-selected={i === sel}
                    onMouseEnter={() => setSel(i)} onClick={() => { nav(`/e/${encodeURIComponent(e.id)}`); onClose(); }}>
                    <span>{e.title}</span>
                    <span className="pal-s">{e.subtitle || e.kind}</span>
                    <span className={`st st-${e.status}`}>{(e.status || '').replace('illustrative-example', 'example')}</span>
                  </button>
                );
              })}
            </div>
          ))}
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
