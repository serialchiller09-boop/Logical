import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppProvider, groupSections, useApp } from './lib/store.jsx';
import { SearchPalette } from './components/SearchPalette.jsx';

const TOOL_LINKS = [
  { to: '/tools', label: 'Tools & simulator', icon: '⌗' },
  { to: '/saved', label: 'My list', icon: '★' },
  { to: '/admin', label: 'Plant data', icon: '✎' }
];

function Sidebar({ onNavigate }) {
  const { sections, bookmarks } = useApp();
  const groups = groupSections(sections);
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 100 60" width="42" height="25">
            <line x1="10" y1="6" x2="10" y2="54" stroke="currentColor" strokeWidth="3" />
            <line x1="90" y1="6" x2="90" y2="54" stroke="currentColor" strokeWidth="3" />
            <line x1="10" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="2" />
            <line x1="36" y1="12" x2="36" y2="28" stroke="currentColor" strokeWidth="3" />
            <line x1="46" y1="12" x2="46" y2="28" stroke="currentColor" strokeWidth="3" />
            <line x1="46" y1="20" x2="68" y2="20" stroke="currentColor" strokeWidth="2" />
            <circle cx="78" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
            <line x1="10" y1="42" x2="90" y2="42" stroke="currentColor" strokeWidth="2" strokeOpacity=".45" />
          </svg>
        </span>
        <div>
          <b>Logical</b>
          <span>ladder logic &amp; plant instruments</span>
        </div>
      </div>

      {groups.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="nav-label">{g.group}</div>
          {g.sections.map((s) => (
            <NavLink key={s.slug} to={`/s/${s.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
              <span className="nav-icon">{s.icon}</span>
              <span className="nav-text">{s.label}</span>
              <span className="nav-count">{s.total}</span>
            </NavLink>
          ))}
        </div>
      ))}

      <div className="nav-group">
        <div className="nav-label">Workspace</div>
        {TOOL_LINKS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-text">{t.label}</span>
            {t.to === '/saved' && bookmarks.length > 0 && <span className="nav-count">{bookmarks.length}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="small"><span className="dot" style={{ background: 'var(--power)' }} /> no plant data here</div>
        <div style={{ marginTop: 5 }}>Definitions and patterns only — setpoints, alarm limits and relief
          settings are deliberately not included. Verify against your P&amp;ID legend, tag register and
          cause-and-effect matrix.</div>
      </div>
    </aside>
  );
}

function Topbar() {
  const { setPalette, drawer, setDrawer } = useApp();
  const loc = useLocation();
  const seg = loc.pathname.split('/').filter(Boolean);
  const crumbs = [{ to: '/', label: 'reference' }];
  const LABELS = { s: 'section', e: 'entry', tools: 'tools & simulator', saved: 'my list', admin: 'plant data', search: 'search' };
  if (seg[0] && seg[0] !== '') crumbs.push({ to: `/${seg[0]}${seg[1] ? '' : ''}`, label: LABELS[seg[0]] || seg[0] });
  if (seg[1]) crumbs.push({ to: null, label: decodeURIComponent(seg[1]).replace(/^.*:/, '') });

  return (
    <header className="topbar">
      <button className="burger" onClick={() => setDrawer(!drawer)} aria-label="toggle navigation">≡</button>
      <nav className="crumbs" aria-label="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span style={{ color: 'var(--ink)' }}>{c.label}</span>}
            {i < crumbs.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>
      <div className="search-trigger" onClick={() => setPalette(true)}>
        <span aria-hidden>⌕</span> Search the reference <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" onClick={() => window.print()} title="Print or save this page as a clean PDF">⎙</button>
    </header>
  );
}

function Shell() {
  const { drawer, setDrawer, palette, setPalette } = useApp();
  const loc = useLocation();
  return (
    <div className="shell">
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)} />
      <Sidebar onNavigate={() => setDrawer(false)} />
      <div className="main">
        <Topbar />
        <div className="canvas" key={loc.pathname}>
          <Outlet />
        </div>
      </div>
      <SearchPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
