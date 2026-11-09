import { Link } from 'react-router-dom';
import { notebookPageHref } from '../lib/controlsNotebook.js';

/** Page-based search hits stay visually separate from the app's curated entries. */
export function NotebookResults({ hits, query, limit = hits.length }) {
  return (
    <div className="manual-results">
      {hits.slice(0, limit).map((hit) => (
        <Link className="manual-result" key={hit.page} to={notebookPageHref(hit.page, query)}>
          <span className="manual-result-page">p. {String(hit.page).padStart(2, '0')}</span>
          <span className="manual-result-body">
            <b>{hit.label}</b>
            <span>{hit.snippet}</span>
          </span>
          <span className="manual-result-arrow" aria-hidden="true">↗</span>
        </Link>
      ))}
    </div>
  );
}
