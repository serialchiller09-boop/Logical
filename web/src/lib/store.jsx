import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [sections, setSections] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [palette, setPalette] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const toast = useCallback((text, kind = '') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    api.sections().then((d) => setSections(d.sections || [])).catch(() => {});
    api.state.bookmarks().then((d) => setBookmarks(d.ids || [])).catch(() => {});
  }, []);

  const isMarked = useCallback((id) => bookmarks.includes(id), [bookmarks]);

  const toggleBookmark = useCallback(async (id) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
    try {
      const r = bookmarks.includes(id) ? await api.state.unmark(id) : await api.state.mark(id);
      if (r?.ids) setBookmarks(r.ids);
      toast(bookmarks.includes(id) ? 'bookmark removed' : 'saved to your list', 'ok');
    } catch (e) {
      toast(`could not save: ${e.message}`, 'bad');
      api.state.bookmarks().then((d) => setBookmarks(d.ids || [])).catch(() => {});
    }
  }, [bookmarks, toast]);

  // global shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return; }
      if (e.key === '/' && !typing) { e.preventDefault(); setPalette(true); }
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({
    sections, bookmarks, isMarked, toggleBookmark, toast, palette, setPalette, drawer, setDrawer
  }), [sections, bookmarks, isMarked, toggleBookmark, toast, palette, drawer]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export function useTitle(text) {
  useEffect(() => {
    document.title = text ? `${text} · Logical` : 'Logical — field reference for plant logic';
  }, [text]);
}

/** Print / export current view. */
export function usePrint() {
  return useCallback(() => window.print(), []);
}

export function groupSections(sections = []) {
  const order = [];
  const map = new Map();
  for (const s of sections) {
    if (!map.has(s.group)) { map.set(s.group, []); order.push(s.group); }
    map.get(s.group).push(s);
  }
  return order.map((g) => ({ group: g, sections: map.get(g) }));
}
