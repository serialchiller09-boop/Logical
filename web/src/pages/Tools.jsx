import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useAsync } from '../lib/api.js';
import { useTitle } from '../lib/store.jsx';
import { TagDecoder, TagBatch } from '../components/TagDecoder.jsx';
import { MaCalc, PressureCalc, EnergyCalc, LoopCalc, TimeCalc } from '../components/Calculators.jsx';
import { ErrorBox, Loader, StatusBadge } from '../components/Bits.jsx';
import { RungStatic, subRungs } from '../components/RungDiagram.jsx';

const TABS = [
  { id: 'tag', label: 'Tag decoder' },
  { id: 'calc', label: 'Workbench' },
  { id: 'symbols', label: 'Element key' },
  { id: 'gallery', label: 'Rung gallery' }
];

export default function Tools() {
  useTitle('Tools & simulator');
  const [tab, setTab] = useState('tag');
  const { data: instr, loading } = useAsync(() => api.entries({ section: 'instructions', limit: 100 }), []);
  const { data: rungs } = useAsync(() => api.entries({ section: 'rungs', limit: 40 }), []);

  return (
    <>
      <section className="hero">
        <h1>Tools</h1>
        <p className="hero-lead">
          The parts of this reference that do something: decode a tag against the ISA-5.1 letters, run the
          definitional arithmetic a loop calculation needs, look up an element by either naming convention, and read
          the worked rungs. Every number you can compute here is true by definition; nothing here is a design value.
        </p>
        <div className="hero-meta">
          {TABS.map((t) => (
            <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </section>

      {tab === 'tag' && (
        <div className="stack" style={{ marginTop: 14, gap: 14 }}>
          <div className="card">
            <div className="card-hd"><h3>Single tag</h3><span className="hd-note">ISA-5.1 letters, no guessing</span></div>
            <div className="card-bd"><TagDecoder initial="PT-101" autoFocus /></div>
          </div>
          <div className="card">
            <div className="card-hd"><h3>Tag register sweep</h3><span className="hd-note">paste your list; each row is decoded independently</span></div>
            <div className="card-bd"><TagBatch /></div>
          </div>
          <div className="callout callout-warn">
            <h4>Why the decoder refuses to be helpful</h4>
            <div>
              ISA-5.1 assigns several letters to “user’s choice”. A tool that quietly fills those in becomes the reason a
              panel is mislabelled, so this one reports the ambiguity and points at your tag register and P&amp;ID legend
              instead. If the decoder and your documents disagree, your documents win.
            </div>
          </div>
        </div>
      )}

      {tab === 'calc' && (
        <div className="stack" style={{ marginTop: 14, gap: 14 }}>
          <MaCalc />
          <PressureCalc />
          <EnergyCalc />
          <LoopCalc />
          <TimeCalc />
          <div className="callout callout-info">
            <h4>What is deliberately not here</h4>
            <div>
              No Cv sizing (that needs the valve’s own rated Cv and the service ΔP from your data sheet), no relief
              sizing (API 520 with your vessel’s MAWP from the nameplate), no alarm limit arithmetic, no
              flow-from-ΔP without the meter tube and AGA basis terms. Those all require numbers that belong to your
              plant, and an app cannot supply them honestly.
            </div>
          </div>
        </div>
      )}

      {tab === 'symbols' && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-hd"><h3>Ladder element key</h3><span className="hd-note">vendor name ↔ IEC name, from the {instr?.total ?? '…'} entries in this section</span></div>
          <div className="card-bd">
            {loading && <Loader label="loading element key" />}
            <ErrorBox error={null} />
            {instr && (
              <table className="tbl">
                <thead><tr><th>Element</th><th>Means</th><th>Watch</th><th>Status</th></tr></thead>
                <tbody>
                  {instr.entries.map((e) => (
                    <tr key={e.id}>
                      <td><Link to={`/e/${encodeURIComponent(e.id)}`} className="mono" style={{ color: '#fff', fontWeight: 600 }}>{e.title}</Link></td>
                      <td className="small">{e.subtitle || e.body?.slice(0, 150) || ''}</td>
                      <td className="small muted">{e.kind === 'concept' ? 'behaviour, not an instruction' : 'confirm in your platform manual'}</td>
                      <td><StatusBadge status={e.status} showLabel={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="tiny muted" style={{ margin: '12px 0 0' }}>
              Vendor mnemonics (XIC, XIO, OTE, OTL, ONS, RES, TON, CTU) come from Allen-Bradley / Rockwell
              documentation; the IEC 61131-3 equivalents and pin names come from the standard. A third-party runtime may
              name or scope them differently — the per-entry page lists which document was read.
            </p>
          </div>
        </div>
      )}

      {tab === 'gallery' && (
        <div className="stack" style={{ marginTop: 14, gap: 14 }}>
          <div className="callout callout-info">
            <h4>Printable rung sheet</h4>
            <div>
              Every rung below is static (no simulation state) so it prints clean. Open any one for the interactive
              scanner. Tags and presets are invented placeholders — the point is the structure, not the numbers.
            </div>
          </div>
          {(rungs?.entries || []).map((e) => <RungPreview key={e.id} id={e.id} />)}
          {!rungs && <Loader label="loading rungs" />}
        </div>
      )}
    </>
  );
}

function RungPreview({ id }) {
  const { data } = useAsync(() => api.entry(id), [id]);
  const e = data?.entry;
  if (!e) return null;
  const rungsOnEntry = subRungs(e.payload);
  return (
    <div className="card">
      <div className="card-hd">
        <h3><Link to={`/e/${encodeURIComponent(e.id)}`}>{e.title}</Link></h3>
        <span className="row" style={{ gap: 8 }}>
          <StatusBadge status={e.status} />
          <Link className="btn btn-sm btn-ghost" to={`/e/${encodeURIComponent(e.id)}`}>open ▸</Link>
        </span>
      </div>
      <div className="card-bd">
        {e.payload.purpose && <p className="small muted" style={{ marginTop: 0 }}>{e.payload.purpose}</p>}
        {rungsOnEntry.map((r) => <RungStatic key={r.key} ladder={r.ladder} title={r.title} />)}
      </div>
    </div>
  );
}
