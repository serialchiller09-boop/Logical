import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import EntryPage from './pages/Entry.jsx';
import Tools from './pages/Tools.jsx';
import Saved from './pages/Saved.jsx';
import Admin from './pages/Admin.jsx';
import './styles.css';

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 28, fontFamily: 'var(--mono)' }}>
        <h2 style={{ color: 'var(--bad)' }}>Something broke in the view</h2>
        <p style={{ color: 'var(--ink-2)' }}>{String(this.state.err?.message || this.state.err)}</p>
        <p style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
          The reference data and your saved list are unaffected — reload. If it repeats, the browser console shows the
          stack, and <span style={{ fontFamily: 'var(--mono)' }}>npm run seed:reset</span> rebuilds the local database
          from the version-controlled data modules.
        </p>
        <button onClick={() => location.reload()} style={{ marginTop: 10 }}>Reload</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Boundary>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="s/:slug" element={<Browse />} />
            <Route path="e/:id" element={<EntryPage />} />
            <Route path="tools" element={<Tools />} />
            <Route path="saved" element={<Saved />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Boundary>
  </React.StrictMode>
);
