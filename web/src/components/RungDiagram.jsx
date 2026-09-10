import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GEO, layout, analyze, initialState, collectElements, collectRefs } from '../lib/ladder.js';

/* ------------------------------------------------------------------ text rendering of a rung */
export function describeRung(node, depth = 0) {
  if (!node) return '';
  switch (node.t) {
    case 'no': return `XIC ${node.a}`;
    case 'nc': return `XIO ${node.a}`;
    case 'short': return '--(always)--';
    case 'coil': return `${node.k} ${node.a}`;
    case 'blk': {
      const pins = (node.p || []).filter((p) => p.v != null && p.v !== '').map((p) => `${p.k}=${p.v}`).join(' ');
      return `[${node.k}${node.a ? ' ' + node.a : ''}${pins ? ' ' + pins : ''}]`;
    }
    case 'and': return (node.c || []).map((c) => describeRung(c, depth)).filter(Boolean).join('  AND  ');
    case 'or': return (node.c || []).map((c) => describeRung(c, depth)).filter(Boolean).join('  OR  ');
    default: return '';
  }
}

/** All sub-rungs authored on a rung entry (followOn / proveRung / outputRung / ...). */
export function subRungs(payload) {
  const out = [];
  const main = payload?.ladder;
  if (main) out.push({ key: 'main', title: 'Rung 1', note: payload.purpose || '', ladder: main, io: payload.io || [] });
  const extraKeys = Object.keys(payload || {}).filter((k) => k !== 'ladder' && k !== 'io' && payload[k] && typeof payload[k] === 'object' && payload[k].ladder);
  extraKeys.forEach((k, i) => {
    out.push({ key: k, title: `Rung ${i + 2}`, note: payload[k].note || '', ladder: payload[k].ladder, io: payload[k].io || [] });
  });
  return out;
}

/* ------------------------------------------------------------------ SVG diagram */
function Wire({ w }) {
  if (w.vertical) return <line className={`ld-wire ${w.c === false ? '' : 'hot'}`} x1={w.x} y1={w.y1} x2={w.x} y2={w.y2} />;
  return <line className={`ld-wire ${w.c ? 'hot' : ''}`} x1={w.x1} y1={w.y} x2={w.x2} y2={w.y} />;
}

function Contact({ it, hot }) {
  const cx = it.x + it.w / 2;
  const mid = it.y + GEO.rowH / 2;
  const g = 9;
  const top = mid - 17, bot = mid + 17;
  return (
    <g>
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={it.x} y1={mid} x2={cx - g} y2={mid} />
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={cx + g} y1={mid} x2={it.x + it.w} y2={mid} />
      <line className={`ld-contact ${hot ? 'hot' : ''}`} x1={cx - g} y1={top} x2={cx - g} y2={bot} />
      <line className={`ld-contact ${hot ? 'hot' : ''}`} x1={cx + g} y1={top} x2={cx + g} y2={bot} />
      {it.node.t === 'nc' && <line className={`ld-neg ${hot ? 'hot' : ''}`} x1={cx - 13} y1={bot + 3} x2={cx + 13} y2={top - 3} />}
      <text className="ld-addr" x={cx} y={it.y + 13} textAnchor="middle">{it.node.a}</text>
      <text className="ld-instr" x={cx} y={it.y + 26} textAnchor="middle" style={{ fill: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>
        {it.node.t === 'nc' ? 'XIO' : 'XIC'}
      </text>
      {it.node.l && <text className="ld-label" x={cx} y={it.y + GEO.rowH - 4} textAnchor="middle">{it.node.l}</text>}
    </g>
  );
}

function Coil({ it, hot }) {
  const cx = it.x + it.w / 2, mid = it.y + GEO.rowH / 2;
  const glyph = it.node.k === 'OTL' ? 'L' : it.node.k === 'OTU' ? 'U' : '';
  return (
    <g>
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={it.x} y1={mid} x2={cx - 16} y2={mid} />
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={cx + 16} y1={mid} x2={it.x + it.w} y2={mid} />
      <circle className={`ld-coil ${hot ? 'hot' : ''}`} cx={cx} cy={mid} r={16} />
      {glyph && <text className="ld-title" x={cx} y={mid + 4} textAnchor="middle" style={{ fill: hot ? 'var(--power)' : 'var(--ink-2)', fontSize: 12 }}>{glyph}</text>}
      <text className="ld-addr" x={cx} y={it.y + 13} textAnchor="middle">{it.node.a}</text>
      <text className="ld-instr" x={cx} y={it.y + 26} textAnchor="middle" style={{ fill: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>{it.node.k}</text>
      {it.node.l && <text className="ld-label" x={cx} y={it.y + GEO.rowH - 4} textAnchor="middle">{it.node.l}</text>}
    </g>
  );
}

function Block({ it, hot }) {
  const { x, y, w, h } = it;
  const rows = it.node.p || [];
  const bh = Math.max(h, GEO.rowH - 14);
  const boxY = y + (GEO.rowH - bh) / 2;
  const mid = y + GEO.rowH / 2;
  const rowLimit = 6;
  return (
    <g>
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={x} y1={mid} x2={x + 6} y2={mid} />
      <line className={`ld-wire ${hot ? 'hot' : ''}`} x1={x + w - 6} y1={mid} x2={x + w} y2={mid} />
      <rect className={`ld-box ${hot ? 'hot' : ''} ${it.node._unresolved ? 'unresolved' : ''}`} x={x + 6} y={boxY} width={w - 12} height={bh} rx={5} />
      <text className="ld-title" x={x + w / 2} y={boxY + 15} textAnchor="middle">{it.node.k}{it.node.a ? ` ${it.node.a}` : ''}</text>
      {rows.slice(0, rowLimit).map((p, i) => (
        <g key={i}>
          <text className="ld-pin" x={x + 13} y={boxY + 32 + i * 19}>{p.k}</text>
          <text className="ld-pin-v" x={x + w - 13} y={boxY + 32 + i * 19} textAnchor="end">
            {p._live != null ? p._live : String(p.v ?? '')}
          </text>
        </g>
      ))}
      {rows.length > rowLimit && <text className="ld-legend" x={x + w / 2} y={boxY + bh - 5} textAnchor="middle">+{rows.length - rowLimit} more</text>}
      {it.node.l && <text className="ld-label" x={x + w / 2} y={boxY + bh + 13} textAnchor="middle">{it.node.l}</text>}
    </g>
  );
}

export function RungDiagram({ ladder, map, live, height }) {
  const model = useMemo(() => {
    if (!ladder) return null;
    const box = layout(ladder, map);
    const L = GEO.railPad;
    const shift = L + 6;
    const h = Math.max(box.h, GEO.rowH + 20) + 16;
    const w = box.w + shift + L + 6;
    const outY = h / 2;
    const wires = box.wires
      .map((wr) => wr.vertical
        ? { ...wr, x: wr.x + shift, y1: wr.y1 + 8, y2: wr.y2 + 8 }
        : { ...wr, x1: wr.x1 + shift, x2: wr.x2 + shift, y: wr.y + 8 });
    wires.push({ x1: box.w + shift, x2: w - L, y: outY, c: live ? !!map?.get(ladder) : false });
    const items = box.items.map((it) => ({ ...it, x: it.x + shift, y: it.y + 8 }));
    return { w, h, items, wires, leftRail: L, rightRail: w - L };
  }, [ladder, map, live]);

  if (!model) return null;
  return (
    <div className="ladder-wrap">
      <svg className="ladder" width={model.w} height={height ?? model.h} viewBox={`0 0 ${model.w} ${model.h}`} role="img"
        aria-label={`Ladder rung: ${describeRung(ladder)}`}>
        <line className="ld-rail" x1={model.leftRail} y1={4} x2={model.leftRail} y2={model.h - 4} />
        <line className="ld-rail" x1={model.rightRail} y1={4} x2={model.rightRail} y2={model.h - 4} />
        {model.wires.map((wr, i) => <Wire key={`w${i}`} w={wr} />)}
        {model.items.map((it, i) => {
          const hot = live ? !!map?.get(it.node) : false;
          if (it.node.t === 'coil') return <Coil key={`i${i}`} it={it} hot={hot} />;
          if (it.node.t === 'blk') return <Block key={`i${i}`} it={it} hot={hot} />;
          return <Contact key={`i${i}`} it={it} hot={hot} />;
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ simulator */
const SCAN_STEPS = [
  { label: '100 ms', v: 100 },
  { label: '1 s', v: 1000 },
  { label: '5 s', v: 5000 },
  { label: '30 s', v: 30000 }
];

export function RungSimulator({ entry }) {
  const rungs = useMemo(() => subRungs(entry.payload), [entry]);
  const ioMap = useMemo(() => {
    const m = new Map();
    for (const r of rungs) for (const p of r.io) if (p?.tag) m.set(p.tag, p);
    return m;
  }, [rungs]);

  const baseState = useMemo(() => {
    const all = [...ioMap.values()];
    return initialState(all);
  }, [ioMap]);

  const stRef = useRef(structuredClone(baseState));
  const [tick, setTick] = useState(0);
  const [scans, setScans] = useState(0);
  const [dt, setDt] = useState(1000);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState([]);
  const [showMap, setShowMap] = useState(true);

  const rerender = useCallback(() => setTick((n) => n + 1), []);

  const reset = useCallback(() => {
    stRef.current = structuredClone(initialState([...ioMap.values()]));
    setScans(0); setLog([]); setAuto(false); rerender();
  }, [ioMap, rerender]);

  useEffect(() => { reset(); }, [reset]);

  const doScan = useCallback(() => {
    const st = stRef.current;
    st.dt = dt;
    const writes = [];
    for (const r of rungs) {
      const res = analyze(r.ladder, st, { live: true });
      writes.push(...res.writes.map((w) => ({ ...w, rung: r.title })));
    }
    setScans((n) => n + 1);
    if (writes.length) setLog((l) => [...writes.map((w) => `${new Date().toISOString().slice(11, 19)}  ${w.rung}: ${w.kind} ${w.addr} := ${w.value ? 'TRUE' : 'FALSE'}`), ...l].slice(0, 40));
  }, [dt, rungs]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(doScan, 380);
    return () => clearInterval(t);
  }, [auto, doScan]);

  // dry pass for drawing: clone, then analyze without mutation
  const { maps, conds } = useMemo(() => {
    const st = structuredClone(stRef.current);
    st.dt = 0;
    const maps = [], conds = [];
    for (const r of rungs) {
      const res = analyze(r.ladder, st, { live: false });
      maps.push(res.map); conds.push(res.conducts);
    }
    return { maps, conds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, dt, rungs, showMap]);

  const setBit = (tag, v) => { stRef.current.bits[tag] = v ? 1 : 0; rerender(); };
  const setVal = (tag, v) => {
    const n = Number(v);
    stRef.current.values[tag] = Number.isNaN(n) ? 0 : n;
    rerender();
  };

  const tags = [...ioMap.keys()];
  const discrete = tags.filter((t) => ['DI', 'DO', 'BIT'].includes(ioMap.get(t).type));
  const analog = tags.filter((t) => !['DI', 'DO', 'BIT', 'TIMER', 'COUNTER'].includes(ioMap.get(t).type));
  const timers = Object.entries(stRef.current.timers).filter(([, v]) => v && (v.pre || v.acc || v.dn));
  const counters = Object.entries(stRef.current.counters);

  return (
    <div className="card">
      <div className="sim-bar">
        <span className={`led ${conds.every(Boolean) ? 'on' : conds.some(Boolean) ? 'warn' : ''}`} title="Rung conduction" />
        <b className="small" style={{ letterSpacing: '.04em' }}>SCAN SIMULATOR</b>
        <span className="badge-num">scan #{scans}</span>
        <span className="muted tiny" style={{ marginLeft: 4 }}>
          {dt >= 1000 ? `${dt / 1000}s per scan` : `${dt}ms per scan`} · simulated wall clock {formatMs(scans * dt)}
        </span>
        <div className="row" style={{ marginLeft: 'auto' }}>
          {SCAN_STEPS.map((s) => (
            <button key={s.v} className={`chip ${dt === s.v ? '' : ''}`} aria-pressed={dt === s.v} onClick={() => setDt(s.v)}>{s.label}</button>
          ))}
          <button className="btn btn-sm" onClick={doScan}>Step scan ▸</button>
          <button className={`btn btn-sm ${auto ? 'btn-on' : ''}`} onClick={() => setAuto((a) => !a)}>{auto ? '❚❚ Pause' : '▶ Auto'}</button>
          <button className="btn btn-sm btn-ghost" onClick={reset}>Reset</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowMap((v) => !v)} title="Colour the conductors by the simulated state">{showMap ? 'Energize view: on' : 'Energize view: off'}</button>
        </div>
      </div>

      <div className="card-bd stack">
        {rungs.map((r, i) => (
          <div key={r.key}>
            <div className="row spread" style={{ marginBottom: 4 }}>
              <b className="small" style={{ color: 'var(--ink-2)' }}>{r.title}</b>
              <span className={`state-line`}>{conds[i] ? <span style={{ color: 'var(--power)' }}>rung CONDUCTS</span> : <span className="muted">rung open</span>}</span>
            </div>
            {r.note && <div className="small muted" style={{ marginBottom: 6 }}>{r.note}</div>}
            <RungDiagram ladder={r.ladder} map={showMap ? maps[i] : null} live={showMap} />
            {entry.payload.io && i === 0 && (
              <details style={{ marginTop: 4 }}>
                <summary className="tiny muted" style={{ cursor: 'pointer' }}>read as text</summary>
                <div className="formula" style={{ marginTop: 6 }}>{describeRung(r.ladder)}</div>
              </details>
            )}
          </div>
        ))}

        <div className="grid-2">
          <div>
            <h4 className="mini">Discrete I/O — click to force</h4>
            <div className="sim-grid">
              {discrete.map((t) => {
                const meta = ioMap.get(t);
                const on = !!stRef.current.bits[t];
                return (
                  <div className="io-cell" key={t}>
                    <div className="io-top">
                      <div>
                        <div className="io-tag">{t}</div>
                        <div className="io-addr">{meta.type} · {meta.addr}</div>
                      </div>
                      <button className="toggle" aria-pressed={on} aria-label={`Force ${t}`} onClick={() => setBit(t, !on)} />
                    </div>
                    <div className="io-role">{meta.role}</div>
                  </div>
                );
              })}
              {!discrete.length && <div className="small muted">No discrete points declared on this rung.</div>}
            </div>
          </div>

          {analog.length > 0 && (
            <div>
              <h4 className="mini">Analog values — edit and step</h4>
              <div className="sim-grid">
                {analog.map((t) => (
                  <div className="io-cell" key={t}>
                    <div className="io-tag">{t}</div>
                    <div className="io-addr">{ioMap.get(t).type} · {ioMap.get(t).addr}</div>
                    <div className="num-in">
                      <input type="number" step="any" value={stRef.current.values[t] ?? 0} onChange={(e) => setVal(t, e.target.value)} />
                    </div>
                    <div className="io-role">{ioMap.get(t).role}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(timers.length > 0 || counters.length > 0) && (
          <div className="row" style={{ gap: 14 }}>
            {timers.map(([k, v]) => (
              <span key={k} className="state-line">
                <b>{k}</b> TON/RTO: acc {Math.round(v.acc)}/{v.pre ? Math.round(v.pre) : '—'} ms{v.pre ? ` (${Math.round(v.acc / v.pre * 100)}%)` : ''} · DN {v.dn ? 'TRUE' : 'false'}
              </span>
            ))}
            {counters.map(([k, v]) => (
              <span key={k} className="state-line"><b>{k}</b> count {v.acc} · DN {v.dn ? 'TRUE' : 'false'}</span>
            ))}
          </div>
        )}

        {log.length > 0 && (
          <div>
            <h4 className="mini">Output writes this session</h4>
            <div className="formula" style={{ maxHeight: 120, overflow: 'auto' }}>{log.join('\n')}</div>
          </div>
        )}

        <p className="tiny muted" style={{ margin: 0 }}>
          Model boundary: booleans evaluate exactly as drawn; timers and counters advance one scan period per step;
          MOV/CPT/SEL/LIM/PID operands resolve when they are numeric or a named tag in the I/O list. Real controller
          behaviour additionally depends on scan overlap, I/O update points, task priorities and instruction
          specifics in your firmware manual — this is a teaching model, not a runtime.
        </p>
      </div>
    </div>
  );
}

function formatMs(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Static, non-interactive diagram used in lists and for print. */
export function RungStatic({ ladder, title }) {
  const map = useMemo(() => {
    const st = initialState([]);
    // every contact shown as closed so the diagram reads cleanly without a simulation
    for (const el of collectElements(ladder)) if (el.a) st.bits[el.a] = 1;
    const refs = collectRefs(ladder);
    for (const r of refs) if (st.values[r] == null) st.values[r] = 0;
    return analyze(ladder, st, { live: false }).map;
  }, [ladder]);
  return (
    <div>
      {title && <div className="small muted" style={{ marginBottom: 4 }}>{title}</div>}
      <RungDiagram ladder={ladder} map={map} live />
    </div>
  );
}
