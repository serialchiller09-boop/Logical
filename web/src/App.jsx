import { useCallback, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppProvider, groupSections, useApp } from './lib/store.jsx';
import { SearchPalette } from './components/SearchPalette.jsx';
import { notebookPdfHref } from './lib/controlsNotebook.js';
import { breadcrumbItems } from './lib/crumbs.js';

const SIDEBAR_COLLAPSED_KEY = 'logical.sidebar-collapsed.v1';

const TOOL_LINKS = [
  { to: '/s/rungs', label: 'Ladder lab', icon: '|=|' },
  { to: '/editor', label: 'Rung editor', icon: '+|' },
  { to: '/exercises', label: 'Exercises', icon: '1–6' },
  { to: '/io-sandbox', label: 'I/O sandbox', icon: '◈' },
  { to: '/tools', label: 'Tag & calc tools', icon: '⌗' },
  { to: '/controls-notebook', label: 'Controls notebook', icon: 'CN' },
  { to: '/notebook', label: 'Substation notebook', icon: 'SS' },
  { to: '/saved', label: 'My list', icon: '★' },
  { to: '/admin', label: 'Plant data', icon: '✎' }
];

function loadSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch { /* browser storage can be unavailable */ }
}

function Sidebar({ onNavigate, open = false, collapsed = false, onToggleCollapse }) {
  const { sections, bookmarks } = useApp();
  const groups = groupSections(sections);
  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <span className="brand-mark" aria-hidden title="Logical">
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
        <div className="brand-copy">
          <div className="brand-name">Logical</div>
          <div className="brand-sub">ladder lab &amp; plant reference</div>
        </div>
        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {groups.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="nav-label">{g.group}</div>
          {g.sections.map((s) => (
            <NavLink
              key={s.slug}
              to={`/s/${s.slug}`}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
              title={collapsed ? s.label : undefined}
            >
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
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
            title={collapsed ? t.label : undefined}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-text">{t.label}</span>
            {t.to === '/saved' && bookmarks.length > 0 && <span className="nav-count">{bookmarks.length}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="small"><span className="dot" style={{ background: 'var(--power)' }} /> plant documents govern</div>
        <div style={{ marginTop: 5 }}>Rung tags/numbers are teaching placeholders. Setpoints live in your plant docs.</div>
      </div>
    </aside>
  );
}

function Topbar() {
  const { sections, setPalette, drawer, setDrawer } = useApp();
  const loc = useLocation();
  const crumbs = breadcrumbItems(loc.pathname, sections);

  return (
    <header className="topbar">
      <button type="button" className="burger" onClick={() => setDrawer(!drawer)} aria-label="toggle navigation">≡</button>
      <nav className="crumbs" aria-label="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span style={{ color: 'var(--ink)' }}>{c.label}</span>}
            {i < crumbs.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>
      <button type="button" className="search-trigger" onClick={() => setPalette(true)} aria-label="Search the reference">
        <span aria-hidden>⌕</span>
        <span className="lbl">Search the reference</span>
        <kbd className="search-kbd">⌘K</kbd>
      </button>
      {loc.pathname === '/controls-notebook'
        ? <a className="icon-btn icon-link" href={notebookPdfHref(new URLSearchParams(loc.search).get('page'))} target="_blank" rel="noreferrer" title="Open the original PDF to print" aria-label="Open the original PDF to print">⎙</a>
        : <button type="button" className="icon-btn" onClick={() => window.print()} title="Print or save this page as a clean PDF" aria-label="Print or save this page">⎙</button>}
    </header>
  );
}

function Shell() {
  const { drawer, setDrawer, palette, setPalette } = useApp();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);
  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveSidebarCollapsed(next);
      return next;
    });
  }, []);

  return (
    <div className={`shell ${collapsed ? 'nav-collapsed' : ''}`}>
      <div className={`scrim-nav ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)} />
      <Sidebar
        open={drawer}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onNavigate={() => setDrawer(false)}
      />
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
