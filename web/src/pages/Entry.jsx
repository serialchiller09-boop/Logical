import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useAsync } from '../lib/api.js';
import { useApp, useTitle } from '../lib/store.jsx';
import { BookmarkToggle, ErrorBox, Loader, Provenance, StatusBadge } from '../components/Bits.jsx';
import { Fields } from '../components/Fields.jsx';
import { RungSimulator } from '../components/RungDiagram.jsx';
import { RELATED_CONTROLS_READING } from '../data/controlsNotebook.js';
import { notebookPageHref } from '../lib/controlsNotebook.js';
import {
  findPathLevel,
  nextPathLevel,
  pathLevelHref
} from '../data/progressivePath.js';

function NoteEditor({ id, initial = '' }) {
  const [body, setBody] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();

  useEffect(() => { setBody(initial); setSaved(initial); }, [initial, id]);
  const dirty = body !== saved;

  const save = async () => {
    setBusy(true);
    try {
      await api.state.saveNote(id, body);
      setSaved(body);
      toast(body.trim() ? 'note saved for this browser session' : 'note cleared', 'ok');
    } catch (e) { toast(`could not save note: ${e.message}`, 'bad'); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3 id="entry-note-heading">Your note</h3>
        <span className="hd-note">{dirty ? 'unsaved' : saved ? 'saved for this browser session' : 'not saved'}</span>
      </div>
      <div className="card-bd">
        <textarea
          id="entry-note"
          className="note-area"
          value={body}
          aria-labelledby="entry-note-heading"
          placeholder="Kept on this site for this browser session."
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); }}
        />
        <div className="row spread" style={{ marginTop: 8 }}>
          <span className="tiny muted">⌘/Ctrl+Enter saves.</span>
          <span className="row">
            {saved && <button className="btn btn-sm btn-ghost" onClick={() => { setBody(''); }}>clear</button>}
            <button className="btn btn-sm btn-primary" onClick={save} disabled={!dirty || busy}>{busy ? '…' : 'Save note'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EntryPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isMarked, toggleBookmark } = useApp();
  const { data, loading, error, reload } = useAsync(() => api.entry(id), [id]);
  const entry = data?.entry;
  useTitle(entry?.title);

  useEffect(() => { if (id) api.state.seen(id).catch(() => {}); }, [id]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const pathLevel = useMemo(() => {
    if (!entry?.id) return null;
    if (!entry.payload?.panelScenario && !entry.payload?.pathLab) return null;
    const levelParam = searchParams.get('level');
    const focusParam = searchParams.get('focus');
    // Path chrome only when Home (or a level link) asked for it — bare /e/… keeps full entry copy.
    if (!levelParam && !focusParam) return null;
    return findPathLevel({
      entryId: entry.id,
      levelParam,
      focusParam
    });
  }, [entry, searchParams]);

  const guided = !!(entry?.payload?.panelScenario || pathLevel);
  const goal = pathLevel?.goal
    || entry?.payload?.goal
    || (entry?.payload?.ladder ? entry.subtitle : '');
  const tryThis = Array.isArray(pathLevel?.tryThis)
    ? pathLevel.tryThis
    : (Array.isArray(entry?.payload?.tryThis) ? entry.payload.tryThis : []);
  const scanHint = typeof pathLevel?.scanHint === 'string'
    ? pathLevel.scanHint
    : (typeof entry?.payload?.scanHint === 'string' ? entry.payload.scanHint : '');
  const dockTags = Array.isArray(pathLevel?.dockTags) && pathLevel.dockTags.length
    ? pathLevel.dockTags
    : (Array.isArray(entry?.payload?.dockTags) ? entry.payload.dockTags : []);

  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => { setStepIndex(0); }, [entry?.id, pathLevel?.level, pathLevel?.focusId]);

  const stepCount = tryThis.length;
  const safeStep = stepCount ? Math.min(Math.max(stepIndex, 0), stepCount - 1) : 0;
  const currentStep = stepCount ? tryThis[safeStep] : '';
  const stepsLeft = Math.max(0, stepCount - safeStep - 1);
  const nextLevel = nextPathLevel(pathLevel);

  if (loading) return <Loader label="opening entry" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!entry) return <div className="empty"><b>not found</b></div>;

  const hasRung = !!entry.payload?.ladder;
  const marked = isMarked(entry.id);
  const levelLabel = pathLevel
    ? `Level ${pathLevel.level} · ${pathLevel.levelTitle}`
    : (entry.payload?.levelTitle || entry.payload?.scenarioCard || null);

  return (
    <>
      <div className="detail-head">
        <div className="row spread" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="crumbs">
            <Link to={`/s/${entry.section}`}>{data.section?.label ?? entry.section}</Link>
            <span>/</span>
            <span>{hasRung ? (guided ? 'guided lab' : 'lab') : entry.kind}</span>
          </div>
          <div className="row" style={{ gap: 7 }}>
            <BookmarkToggle id={entry.id} marked={marked} onToggle={toggleBookmark} />
            <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>⎙ print</button>
            <Link className="btn btn-sm btn-ghost" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>
              {hasRung ? '✎ edit lab wording' : '✎ record plant answer'}
            </Link>
          </div>
        </div>

        {hasRung && levelLabel && (
          <p className="path-level-line">{levelLabel}</p>
        )}
        <h1 className="detail-title">{entry.title}</h1>
        {hasRung ? (
          goal && <p className="sim-goal-line">{goal}</p>
        ) : (
          entry.subtitle && <p className="detail-sub">{entry.subtitle}</p>
        )}
        {hasRung && guided && (
          <p className="tiny muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>
            Practice only — flip the panel switches, then press Step. Not real plant I/O.
            {pathLevel?.level >= 6 ? ' The discharge timer is a wait, not a safety proof.' : ''}
          </p>
        )}
        {!hasRung && (
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 7 }}>
            <StatusBadge status={entry.status} />
            {entry.edited && <span className="st st-site-specific" title="This entry has been changed from the shipped reference content — the diff is in plant data.">edited from reference</span>}
            {(entry.tags || []).map((t) => (
              <Link key={t} className="pill" to={`/s/search?q=${encodeURIComponent(t)}`}>{t}</Link>
            ))}
          </div>
        )}
      </div>

      {hasRung ? (
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          {tryThis.length > 0 && (
            <div className="try-block">
              <div className="row spread" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                <b className="small" style={{ letterSpacing: '.04em', color: 'var(--ink-2)' }}>
                  {guided ? `Step ${safeStep + 1} of ${stepCount}` : 'Try this'}
                </b>
                <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {dockTags.length > 0 && (
                    <span className="tiny muted">Watch these on the panel: {dockTags.join(' · ')}</span>
                  )}
                  <Link className="tiny" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>edit wording</Link>
                </span>
              </div>

              {guided ? (
                <>
                  <div className="try-step-current" role="status">
                    {currentStep}
                  </div>
                  <div className="row spread" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                    <span className="tiny muted">
                      {stepsLeft > 0 ? `${stepsLeft} step${stepsLeft === 1 ? '' : 's'} left` : 'Last step for this level'}
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {safeStep > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setStepIndex((n) => Math.max(0, n - 1))}
                        >
                          ← Back
                        </button>
                      )}
                      {safeStep < stepCount - 1 ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setStepIndex((n) => Math.min(stepCount - 1, n + 1))}
                        >
                          Next step →
                        </button>
                      ) : nextLevel ? (
                        <Link className="btn btn-sm btn-primary" to={pathLevelHref(nextLevel)}>
                          Next level →
                        </Link>
                      ) : null}
                    </span>
                  </div>
                </>
              ) : (
                <ol className="try-steps">
                  {tryThis.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              )}

              {scanHint && (
                <p className="scan-hint" role="note">
                  <span className="scan-hint-label">What you should see</span>
                  {scanHint}
                  <span className="tiny muted"> — a tip for practice, not a grade.</span>
                </p>
              )}
            </div>
          )}

          <RungSimulator
            entry={entry}
            compact
            emphasizeTags={dockTags}
            focusDockOnly={guided && dockTags.length > 0}
          />

          <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
            {nextLevel ? (
              <Link className="btn btn-sm" to={pathLevelHref(nextLevel)}>
                Next level → Level {nextLevel.level} · {nextLevel.levelTitle}
              </Link>
            ) : <span />}
            <Link className="tiny muted" to="/">All practice labs</Link>
          </div>

          <details className="more-detail">
            <summary>More detail (how to read it, gotchas, provenance)</summary>
            <div className="stack" style={{ gap: 14, marginTop: 12 }}>
              {entry.body && (
                <div className="card">
                  <div className="card-bd">
                    <div className="prose" style={{ marginTop: 0 }}>
                      {String(entry.body).split('\n').map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                  </div>
                </div>
              )}
              <Fields entry={entry} />
              <Provenance sources={entry.sources} status={entry.status} />
              <NoteEditor id={entry.id} initial={data.note?.body || ''} />
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                <Link className="pill" to="/s/rungs">all ladder lab</Link>
                <Link className="pill" to="/s/instructions">ladder elements</Link>
                <Link className="pill" to={`/admin?entry=${encodeURIComponent(entry.id)}`}>plant answer</Link>
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div className="detail-grid">
          <div className="stack" style={{ gap: 14, minWidth: 0 }}>
            {entry.body && (
              <div className="card">
                <div className="card-bd">
                  <div className="prose" style={{ marginTop: 0 }}>
                    {String(entry.body).split('\n').map((l, i) => <p key={i}>{l}</p>)}
                  </div>
                </div>
              </div>
            )}
            <Fields entry={entry} />
          </div>

          <aside className="stack" style={{ gap: 14 }}>
            <Provenance sources={entry.sources} status={entry.status} />
            <NoteEditor id={entry.id} initial={data.note?.body || ''} />

            <div className="card">
              <div className="card-hd"><h3>Jump to</h3></div>
              <div className="card-bd">
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <Link className="pill" to={`/s/${entry.section}`}>all {data.section?.label ?? entry.section}</Link>
                  {entry.section === 'isa-letters' && <Link className="pill" to="/tools">tag decoder</Link>}
                  {entry.section === 'pid' && <Link className="pill" to="/tools">Kc / PB workbench</Link>}
                  {RELATED_CONTROLS_READING[entry.section] && <Link className="pill" to={notebookPageHref(RELATED_CONTROLS_READING[entry.section].page)}>related notebook reading</Link>}
                  <Link className="pill" to={`/s/search?q=${encodeURIComponent(entry.title)}`}>find mentions of this</Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="pager">
        {data.prev ? <Link to={`/e/${encodeURIComponent(data.prev.id)}`}>← {data.prev.title}</Link> : <span />}
        {data.next ? <Link style={{ textAlign: 'right' }} to={`/e/${encodeURIComponent(data.next.id)}`}>{data.next.title} →</Link> : <span />}
      </div>
    </>
  );
}
