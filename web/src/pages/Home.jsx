import { Link } from 'react-router-dom';
import { useApp, useTitle } from '../lib/store.jsx';
import { useAsync, api } from '../lib/api.js';
import { Loader } from '../components/Bits.jsx';

export default function Home() {
  useTitle(null);
  const { sections } = useApp();
  const { data: stats } = useAsync(() => api.stats(), []);
  const { data: rungs, loading: rungsLoading } = useAsync(() => api.entries({ section: 'rungs', limit: 40 }), []);
  const lab = sections.find((s) => s.slug === 'rungs');
  const reference = sections.filter((s) => s.slug !== 'rungs');

  return (
    <>
      <section className="hero">
        <h1>Ladder lab</h1>
        <p className="hero-lead">
          Pick a rung. Read the one-line goal. Force the inputs and step the scan —
          watch the wires light up. Reference pages stay in the sidebar when you need them.
        </p>
        <div className="hero-meta">
          <Link className="pill pill-accent" to="/s/rungs">
            <b className="num">{stats?.rungCount ?? lab?.total ?? 17}</b> runnable rungs →
          </Link>
          <span className="pill">search <kbd>⌘K</kbd></span>
          <Link className="pill" to="/tools?tab=gallery">printable gallery</Link>
        </div>
      </section>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-hd">
          <h3>Try one</h3>
          <span className="hd-note">goal first — open to simulate</span>
        </div>
        <div className="card-bd">
          {rungsLoading && <Loader label="loading rungs" />}
          <div className="rung-lab-grid">
            {(rungs?.entries || []).map((e) => (
              <Link key={e.id} to={`/e/${encodeURIComponent(e.id)}`} className="rung-lab-card">
                <span className="rung-lab-title">{e.title}</span>
                <span className="rung-lab-goal">{e.subtitle}</span>
                <span className="rung-lab-go">open sim →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <details className="more-detail" style={{ marginTop: 18 }}>
        <summary>Reference library ({reference.reduce((n, s) => n + (s.total || 0), 0)} entries)</summary>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-bd" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {reference.map((s) => (
              <Link key={s.slug} to={`/s/${s.slug}`} className="entry" style={{ textDecoration: 'none', display: 'block' }}>
                <div className="entry-t"><span>{s.icon} {s.label}</span><span className="num muted">{s.total}</span></div>
                <div className="entry-s">{s.blurb}</div>
              </Link>
            ))}
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          Plant documents govern. Curated entries omit setpoints; rung tags and numbers are teaching placeholders.
        </p>
      </details>
    </>
  );
}
