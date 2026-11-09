import { useCallback, useEffect, useState } from 'react';
import { loadControlsNotebookIndex } from './controlsNotebook.js';

export function useControlsNotebookIndex(enabled = true) {
  const [state, setState] = useState({ index: null, loading: enabled, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setState((old) => ({ ...old, loading: true, error: null }));
    loadControlsNotebookIndex().then(
      (index) => { if (active) setState({ index, loading: false, error: null }); },
      (error) => { if (active) setState({ index: null, loading: false, error }); }
    );
    return () => { active = false; };
  }, [enabled, attempt]);

  return { ...state, retry };
}
