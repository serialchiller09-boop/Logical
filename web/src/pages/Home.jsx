import { Link } from 'react-router-dom';
import { useApp, useTitle } from '../lib/store.jsx';
import { useAsync, api } from '../lib/api.js';
import { StatusLegend } from '../components/Bits.jsx';
import { TagDecoder } from '../components/TagDecoder.jsx';

export default function Home() {
  useTitle(null);
  const { sections } = useApp();
  const { data: stats } = useAsync(() => api.stats(), []);
  const total = sections.reduce((n, s) => n + (s.total || 0), 0);
  const groups = [...new Set(sections.map((s) => s.group))];

  return (
    <>
      <section className="hero">
        <h1>Read plant logic without guessing.</h1>
        <p className="hero-lead">
          A pocket reference and working tool for ladder logic around gas plant equipment: ISA-5.1 tags, valves and
          actuators, transmitters, IEC 61131-3 data types, ladder and function-block elements, PID structure, process
          stages, and the safety/interlock vocabulary that sits on top of all of it — with a rung simulator you can
          actually step.
        </p>
        <div className="hero-meta">
          <span className="pill pill-accent"><b className="num">{stats?.totals?.entries ?? total}</b> entries</span>
          <span className="pill"><b className="num">{sections.length}</b> sections</span>
          <span className="pill"><b className="num">{stats?.rungCount ?? 16}</b> runnable rungs</span>
          <span className="pill">search <kbd>⌘K</kbd></span>
          <span className="pill" style={{ color: 'var(--warn)' }}>no setpoints, ever — by design</span>
        </div>
      </section>

      <div className="callout callout-info" style={{ marginTop: 18 }}>
        <h4>how to trust anything on this site</h4>
        <div>
          Every entry carries a provenance badge — <b>standard-defined</b>, <b>industry practice</b>, <b>vendor-specific</b>,{' '}
          <b>site-specific</b>, <b>unverified</b> or <b>authored example</b> — plus a pointer to the document it came from.
          Numbers are limited to definitional arithmetic (a 4-20 mA mapping, <span className="mono">psia = psig + atmospheric</span>,{' '}
          <span className="mono">Kc = 100/PB</span>, bit widths). <b>Setpoints, alarm and trip values, relief settings and
          process conditions are deliberately not included</b>: they belong to your plant. Rung examples use invented tags
          and placeholder presets, labelled as such. Published tuning rules are shown as classroom relations, not as design
          values. Where ISA-5.1 leaves a letter to "user's choice", this app refuses to invent a meaning.
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-hd"><h3>Decode a tag</h3><Link to="/tools" className="tiny">full tools ↗</Link></div>
          <div className="card-bd">
            <TagDecoder initial="FCV-205A" />
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><h3>Start here</h3><span className="hd-note">4 groups, {sections.length} sections</span></div>
          <div className="card-bd stack">
            {groups.map((g) => (
              <div key={g}>
                <div className="nav-label" style={{ padding: '2px 0 6px' }}>{g}</div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
                  {sections.filter((s) => s.group === g).map((s) => (
                    <Link key={s.slug} to={`/s/${s.slug}`} className="pill" title={s.blurb}>
                      <span>{s.icon}</span> {s.label} <span className="muted num" style={{ fontSize: 11 }}>{s.total}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-hd"><h3>Sections</h3><span className="hd-note">what each one is for</span></div>
        <div className="card-bd" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 11 }}>
          {sections.map((s) => (
            <Link key={s.slug} to={`/s/${s.slug}`} className="entry" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="entry-t"><span>{s.icon} {s.label}</span><span className="num muted">{s.total}</span></div>
              <div className="entry-s">{s.blurb}</div>
              {s.long && <div className="entry-b">{s.long}</div>}
              <div className="row" style={{ gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                {Object.entries(s.kinds || {}).slice(0, 5).map(([k, n]) => <span key={k} className="tiny muted">{k} · {n}</span>)}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-hd"><h3>Provenance badges</h3></div>
          <div className="card-bd"><StatusLegend /></div>
        </div>
        <div className="card">
          <div className="card-hd"><h3>Two ways to work here</h3></div>
          <div className="card-bd">
            <div className="stack">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="nav-icon" style={{ fontSize: 18 }}>⌕</span>
                <div><b className="small">Read</b><p className="tiny muted" style={{ margin: 0 }}>⌘K / <kbd>/</kbd> searches every field. Each entry links its
                  sources, related letters and the exact table it came from, and prints as a clean page for a field copy.</p></div>
              </div>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="nav-icon" style={{ fontSize: 18 }}>▤</span>
                <div><b className="small">Try</b><p className="tiny muted" style={{ margin: 0 }}>Rung entries draw the ladder and run a simplified virtual-tick
                  scan: force the inputs, step the scan, watch DN bits, seal-ins and timers. Your own tags and presets
                  belong in the <Link to="/admin">plant data</Link> editor, not in the reference text.</p></div>
              </div>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="nav-icon" style={{ fontSize: 18 }}>✎</span>
                <div><b className="small">Record</b><p className="tiny muted" style={{ margin: 0 }}>Bookmark what you need on a round, keep notes per entry, and store
                  plant-specific answers (what <span className="mono">FV</span> means on <i>your</i> P&amp;ID) as edited entries. Your state lives in the
                  SQLite file, never in the seed data.</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
