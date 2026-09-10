import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useDebounced } from '../lib/api.js';

const CONF = {
  high: { label: 'consistent with ISA-5.1 letters', cls: 'st-standard' },
  medium: { label: 'partly a site convention', cls: 'st-practice' },
  low: { label: 'site convention - not ISA-assigned', cls: 'st-site-specific' }
};

export function TagDecoder({ initial = '', autoFocus = false }) {
  const [tag, setTag] = useState(initial);
  const q = useDebounced(tag, 220);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const inp = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!q.trim()) { setRes(null); setErr(null); return; }
    api.decode(q.trim())
      .then((r) => { if (alive) { setRes(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [q]);

  useEffect(() => { if (autoFocus) inp.current?.focus(); }, [autoFocus]);

  const ex = ['PT-101', 'FCV-205A', 'XV-300', 'TSHH-410', 'PDCV-12', 'LZSH-600'];

  return (
    <div className="stack">
      <div className="row">
        <input
          ref={inp} className="search-input" style={{ maxWidth: 340, flex: '0 1 340px' }}
          value={tag} placeholder="tag or loop id, e.g. FCV-205A" spellCheck={false}
          onChange={(e) => setTag(e.target.value)} aria-label="Tag to decode"
        />
        <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          {ex.map((t) => (
            <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>
          ))}
        </span>
      </div>

      {err && <div className="callout callout-bad"><h4>decode failed</h4><div className="small">{String(err.message)}</div></div>}

      {!q.trim() && (
        <p className="small muted" style={{ margin: 0 }}>
          Enter a tag and the app splits it into prefix / area / function letters / loop number / suffix, then maps each
          letter against the ISA-5.1 tables. Nothing is guessed: where the standard leaves a letter to the user, the
          decoder says so and links you to the table that documents that.
        </p>
      )}

      {res?.ok && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono" style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>{res.normalized}</span>
              <span className={`st ${CONF[res.confidence]?.cls || 'st-practice'}`}>{CONF[res.confidence]?.label || res.confidence}</span>
            </div>
            <span className="tiny muted">{res.loopNumber ? `loop ${res.loopNumber}` : 'no loop number found'}</span>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
            {res.letters.map((L, i) => (
              <div key={i} className="io-cell" style={{ padding: '8px 11px', minWidth: 0, display: 'block' }}>
                <div className="row" style={{ gap: 7 }}>
                  <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: L.assignedByISA ? 'var(--accent)' : 'var(--ink)' }}>{L.letter}</span>
                  {L.role && <span className="tiny" style={{ color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.11em' }}>{L.role}</span>}
                </div>
                <div className="small" style={{ color: 'var(--ink)', marginTop: 2 }}>{L.meaning}</div>
                <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <span className={`tiny ${L.assignedByISA ? 'muted' : ''}`} style={L.assignedByISA ? undefined : { color: 'var(--bad)' }}>
                    {L.assignedByISA ? `basis: ${L.basis}` : 'ISA: assigned by the user — check your legend'}
                  </span>
                  {L.entryId && <Link className="tiny" to={`/e/${encodeURIComponent(L.entryId)}`}>table ↗</Link>}
                </div>
              </div>
            ))}
          </div>

          <div className="callout callout-info">
            <h4>how to read this</h4>
            <div>{res.summary}</div>
          </div>

          {res.prefix?.length > 1 && (
            <div className="small"><span className="muted">Prefix(es):</span> {res.prefix.map((p, i) => (
              <span key={i}>{p.meaning || p.letter}{i < res.prefix.length - 1 ? ' · ' : ''}</span>))}</div>
          )}

          {res.warnings.length > 0 && (
            <div className="callout callout-warn">
              <h4>Read before using this</h4>
              <ul>{res.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {res && !res.ok && (
        <div className="callout callout-warn"><h4>cannot decode</h4><div>{res.error}</div></div>
      )}
    </div>
  );
}

/** Paste-a-list decoder: N single-tag decodes, rendered as a register you can eyeball. */
export function TagBatch() {
  const [text, setText] = useState('PT-101\nFCV-205A\nXV-300\nLZSH-600\nPDCV-12');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const tags = text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean).slice(0, 100);
    if (!tags.length) { setRows([]); return; }
    setBusy(true);
    const out = await Promise.all(tags.map((t) => api.decode(t).then((r) => ({ t, r })).catch((e) => ({ t, r: { ok: false, error: String(e.message) } }))));
    setRows(out);
    setBusy(false);
  };

  const firstLetterMeanings = useMemo(() => {
    const m = new Map();
    for (const { r } of rows) if (r?.ok) for (const L of r.letters) if (L.role === 'first letter') m.set(L.letter, L.meaning);
    return m;
  }, [rows]);

  return (
    <div className="stack">
      <div className="row">
        <textarea className="note-area" style={{ minHeight: 84, flex: 1 }} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste tags, one per line or comma-separated" />
        <button className="btn btn-primary" onClick={run} disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? '…' : 'Decode all'}</button>
      </div>
      {rows.length > 0 && (
        <table className="tbl">
          <thead><tr><th>Tag</th><th>Letters</th><th>Loop</th><th>Confidence</th><th>Reads as</th></tr></thead>
          <tbody>
            {rows.map(({ t, r }) => (
              <tr key={t}>
                <td className="mono" style={{ color: '#fff', fontWeight: 600 }}>{t}</td>
                <td className="mono">{r.ok ? r.letters.map((l) => l.letter).join('') : '—'}</td>
                <td className="mono">{r.loopNumber || '—'}</td>
                <td>{r.ok ? <span className={`st ${CONF[r.confidence]?.cls}`}>{r.confidence}</span> : <span className="st st-unverified">error</span>}</td>
                <td className="small muted">{r.ok ? r.summary : r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {firstLetterMeanings.size > 0 && (
        <div className="callout callout-info">
          <h4>first letters seen in this list</h4>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {[...firstLetterMeanings.entries()].map(([k, v]) => (
              <span key={k} className="pill"><b className="mono" style={{ color: 'var(--accent)' }}>{k}</b> {v}</span>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            If one letter is used for two different variables in this list, your register is inconsistent — that is a
            tag-register defect worth fixing at the source, not something a decoder can resolve.
          </div>
        </div>
      )}
    </div>
  );
}
