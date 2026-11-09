import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { NotebookResults } from '../components/NotebookResults.jsx';
import { CONTROLS_CHAPTERS, CONTROLS_NOTEBOOK, FRONT_MATTER } from '../data/controlsNotebook.js';
import { useDebounced } from '../lib/api.js';
import {
  notebookPageHref, notebookPageLabel, notebookPageNumber, notebookPdfHref, searchNotebookPages
} from '../lib/controlsNotebook.js';
import { useControlsNotebookIndex } from '../lib/useControlsNotebook.js';
import { useTitle } from '../lib/store.jsx';

const QUICK_LINKS = [
  { n: '00', label: 'Working rules', note: 'Start here', page: 7 },
  { n: '05', label: 'Ladder patterns', note: 'Section 5.4', page: 41 },
  { n: '10', label: 'Hands-on labs', note: '12 exercises', page: 69 },
  { n: 'E', label: 'Field pocket card', note: 'Print from PDF', page: 93 },
  { n: 'F', label: 'Training program', note: 'Cards & sign-off', page: 95 }
];

function Chapter({ chapter, query }) {
  return (
    <details className="manual-chapter">
      <summary>
        <span className="manual-chapter-num">{chapter.number}</span>
        <span className="manual-chapter-title"><b>{chapter.title}</b><small>{chapter.description}</small></span>
        <span className="manual-chapter-page">p. {chapter.page}</span>
        <span className="manual-chapter-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="manual-chapter-links">
        <Link to={notebookPageHref(chapter.page, query)} className="manual-chapter-start">Open {chapter.kind} <span>p. {chapter.page} ↗</span></Link>
        {chapter.items.map(([title, page]) => (
          <Link key={`${title}-${page}`} to={notebookPageHref(page, query)}>
            <span>{title}</span><span>p. {page}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}

function Reader({ page, query, index, loading, error, retry, readerRef }) {
  // Many mobile browsers cannot render PDFs inside an iframe. Start with the
  // accessible text preview on narrow screens; the original remains one tap away.
  const [view, setView] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches ? 'text' : 'pdf');
  const [pageInput, setPageInput] = useState(String(page));
  const navigate = useNavigate();
  useEffect(() => setPageInput(String(page)), [page]);
  const pageText = index?.pages[page - 1]?.text;

  const goToPage = (event) => {
    event.preventDefault();
    if (!/^\d+$/.test(pageInput)) return;
    const number = Number(pageInput);
    if (number < 1 || number > CONTROLS_NOTEBOOK.pageCount) return;
    navigate(notebookPageHref(number, query));
  };

  return (
    <section className="manual-reader" id="reader" ref={readerRef} aria-labelledby="manual-reader-title">
      <div className="manual-reader-head">
        <div>
          <div className="manual-eyebrow">THE ORIGINAL DOCUMENT</div>
          <h2 id="manual-reader-title">Notebook reader</h2>
          <p>Opening at page <b>{page}</b> · {notebookPageLabel(page)}</p>
        </div>
        <a className="btn btn-sm" href={notebookPdfHref(page)} target="_blank" rel="noreferrer">Open PDF ↗</a>
      </div>
      <div className="manual-reader-controls">
        <div className="manual-view-switch" role="group" aria-label="Reader view">
          <button type="button" aria-pressed={view === 'pdf'} onClick={() => setView('pdf')}>Original PDF</button>
          <button type="button" aria-pressed={view === 'text'} onClick={() => setView('text')}>Text preview</button>
        </div>
        <form className="manual-page-form" onSubmit={goToPage}>
          <label htmlFor="manual-page-number">Page</label>
          <input id="manual-page-number" type="number" min="1" max={CONTROLS_NOTEBOOK.pageCount} required
            value={pageInput} onChange={(event) => setPageInput(event.target.value)} />
          <span>/ {CONTROLS_NOTEBOOK.pageCount}</span>
          <button className="btn btn-sm" type="submit">Go</button>
        </form>
      </div>

      {view === 'pdf' ? (
        <div className="manual-pdf-frame">
          <iframe key={page} title={`Original controls notebook PDF, opening at page ${page}`}
            src={notebookPdfHref(page)} loading="lazy" />
        </div>
      ) : (
        <div className="manual-text-view">
          <div className="manual-text-notice">Extracted text is for finding and previewing content. Tables, symbols and warnings may not extract correctly; always check the original PDF.</div>
          {loading && !index && <p className="small muted">Loading page text…</p>}
          {error && <p className="small">Could not load the text preview. <button className="inline-action" onClick={retry}>Try again</button> or open the original PDF.</p>}
          {typeof pageText === 'string' && (pageText ? <pre>{pageText.split('\n').map((line) => line.trim().replace(/ {2,}/g, '  ')).join('\n')}</pre> : <p className="small muted">This page has no extractable text. View the original PDF.</p>)}
        </div>
      )}

      <div className="manual-reader-foot">
        <div className="manual-reader-pager">
          {page > 1 ? <Link className="btn btn-sm btn-ghost" to={notebookPageHref(page - 1, query)}>← Previous</Link> : <button className="btn btn-sm btn-ghost" disabled>← Previous</button>}
          {page < CONTROLS_NOTEBOOK.pageCount ? <Link className="btn btn-sm btn-ghost" to={notebookPageHref(page + 1, query)}>Next →</Link> : <button className="btn btn-sm btn-ghost" disabled>Next →</button>}
        </div>
        <p>If the embedded PDF does not display on your device, use <a href={notebookPdfHref(page)} target="_blank" rel="noreferrer">Open PDF</a> or Text preview. Print the manual from the PDF viewer.</p>
      </div>
    </section>
  );
}

export default function ControlsNotebook() {
  useTitle('Controls notebook');
  const [params] = useSearchParams();
  const location = useLocation();
  const page = notebookPageNumber(params.get('page'));
  const urlQuery = params.get('q') || '';
  // Keep the input responsive while router transitions settle; page links carry
  // the current query so returning to a result restores the same search.
  const [query, setQuery] = useState(urlQuery);
  useEffect(() => setQuery(urlQuery), [urlQuery]);
  const debouncedQuery = useDebounced(query, 180);
  const { index, loading, error, retry } = useControlsNotebookIndex();
  const hits = useMemo(() => searchNotebookPages(index, debouncedQuery), [index, debouncedQuery]);
  const [showAll, setShowAll] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => setShowAll(false), [debouncedQuery]);
  useEffect(() => {
    if (location.hash !== '#reader') return undefined;
    const frame = requestAnimationFrame(() => readerRef.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.hash]);

  const updateQuery = (value) => setQuery(value);
  const sections = CONTROLS_CHAPTERS.filter((chapter) => chapter.kind === 'section');
  const appendices = CONTROLS_CHAPTERS.filter((chapter) => chapter.kind === 'appendix');
  const searching = debouncedQuery.trim().length >= 2;

  return (
    <div className="manual-page">
      <section className="manual-hero" aria-labelledby="controls-notebook-heading">
        <div className="manual-hero-copy">
          <div className="manual-eyebrow"><span className="manual-status-dot" /> YOUR NOTEBOOK <span className="manual-eyebrow-separator">/</span> REFERENCE MANUAL</div>
          <h1 id="controls-notebook-heading">Gas plant controls<br /><em>&amp; automation.</em></h1>
          <p>Your complete controls notebook, made easier to search and navigate. Find the page you need, then read it in the original, printer-friendly manual.</p>
          <div className="manual-hero-actions">
            <a className="btn btn-primary" href={notebookPdfHref()} target="_blank" rel="noreferrer">Open the manual ↗</a>
            <a className="btn" href={CONTROLS_NOTEBOOK.pdfUrl} download>↓ Download PDF</a>
          </div>
          <div className="manual-hero-meta"><span>REV {CONTROLS_NOTEBOOK.revision}</span><i /><span>{CONTROLS_NOTEBOOK.revisionDate}</span><i /><span>{CONTROLS_NOTEBOOK.pageCount} PAGES</span></div>
        </div>
        <div className="manual-cover" aria-hidden="true">
          <div className="manual-cover-top"><span>LOGICAL / DOCUMENT 01</span><span>●</span></div>
          <div className="manual-cover-lines"><i /><i /><i /><i /></div>
          <div className="manual-cover-title">CONTROLS<br />&amp; AUTOMATION<br /><span>REFERENCE MANUAL</span></div>
          <div className="manual-cover-bottom"><span>GAS PLANT<br />FIELD REFERENCE</span><b>1.2</b></div>
        </div>
      </section>

      <div className="manual-safety" role="note">
        <span className="manual-safety-icon" aria-hidden="true">!</span>
        <div><b>Plant documents govern.</b> This is the supplied source manual, not a verified operating procedure. Examples may contain illustrative values, addresses or unverified instructions; use approved site documents, authorization and protective systems. The original cover marks it as internal use; share only as authorized.</div>
      </div>

      <section className="manual-quick" aria-label="Popular notebook sections">
        <div className="manual-section-heading"><div><div className="manual-eyebrow">GET TO THE RIGHT PAGE</div><h2>Start anywhere.</h2></div><span>5 QUICK JUMPS</span></div>
        <div className="manual-quick-grid">
          {QUICK_LINKS.map((item) => (
            <Link to={notebookPageHref(item.page, query)} key={item.n} className="manual-quick-card">
              <span className="manual-quick-number">{item.n}</span><b>{item.label}</b><small>{item.note}</small><span className="manual-quick-arrow">p. {item.page} ↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="manual-search" aria-labelledby="manual-search-title">
        <div className="manual-search-top">
          <div><div className="manual-eyebrow">SEARCH THE SOURCE</div><h2 id="manual-search-title">Find it in your notebook.</h2><p>Search the extracted text of all {CONTROLS_NOTEBOOK.pageCount} PDF pages.</p></div>
          <span className="manual-search-tag">FULL TEXT / REV {CONTROLS_NOTEBOOK.revision}</span>
        </div>
        <div className="manual-search-input">
          <span aria-hidden="true">⌕</span>
          <input type="search" aria-label="Search the controls notebook" value={query}
            onChange={(event) => updateQuery(event.target.value)} placeholder="Try HART, seal-in, FLEX I/O or H₂S…" />
          {query && <button type="button" onClick={() => updateQuery('')} aria-label="Clear notebook search">×</button>}
        </div>
        <div className="manual-search-status" aria-live="polite">
          {error ? <>Search index unavailable. <button className="inline-action" onClick={retry}>Try again</button>; the original PDF is still available.</>
            : loading && !index ? 'Loading the notebook index…'
              : searching ? `${hits.length} matching page${hits.length === 1 ? '' : 's'} · open a result in the original document`
                : 'Enter two or more characters. Matches are grouped by PDF page.'}
        </div>
        {searching && !error && index && (
          hits.length ? <>
            <NotebookResults hits={hits} query={debouncedQuery} limit={showAll ? hits.length : 8} />
            {hits.length > 8 && <button className="manual-show-all" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer pages ↑' : `Show all ${hits.length} matching pages ↓`}</button>}
          </> : <div className="manual-no-results">No pages contain all those terms. Try a shorter search or another spelling.</div>
        )}
      </section>

      <div className="manual-workspace">
        <section className="manual-directory" aria-labelledby="manual-directory-title">
          <div className="manual-section-heading"><div><div className="manual-eyebrow">DOCUMENT MAP</div><h2 id="manual-directory-title">Inside the manual.</h2></div><span>12 SECTIONS / 8 APPENDICES</span></div>
          <p className="manual-directory-intro">Expand a chapter to jump straight to a topic or lab in the source PDF.</p>
          <div className="manual-front-links">{FRONT_MATTER.map((item) => <Link key={item.page} to={notebookPageHref(item.page, query)}>{item.title} <span>p. {item.page} ↗</span></Link>)}</div>
          <div className="manual-directory-label">SECTIONS <span>00 — 11</span></div>
          <div className="manual-chapters">{sections.map((chapter) => <Chapter key={chapter.id} chapter={chapter} query={query} />)}</div>
          <div className="manual-directory-label">APPENDICES <span>A — H</span></div>
          <div className="manual-chapters">{appendices.map((chapter) => <Chapter key={chapter.id} chapter={chapter} query={query} />)}</div>
          <div className="manual-related">
            <b>Keep exploring in Logical</b>
            <p>The source manual is separate from Logical’s curated reference entries and simulator.</p>
            <div><Link to="/s/instructions">Ladder elements ↗</Link><Link to="/s/safety">Safety &amp; interlocks ↗</Link><Link to="/tools">Tools &amp; simulator ↗</Link></div>
          </div>
        </section>
        <Reader page={page} query={query} index={index} loading={loading} error={error} retry={retry} readerRef={readerRef} />
      </div>
    </div>
  );
}
