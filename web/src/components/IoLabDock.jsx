import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { applyBusToPanel, createPanelFromLadderIo, lampTest } from '../lib/ioSandbox.js';
import { preferDockList } from '../lib/dockLayout.js';
import {
  isCouplingEnabled,
  loadTagBus,
  publishSnapshot,
  setBit,
  setValue,
  subscribeTagBus
} from '../lib/tagBus.js';

export const DOCK_LAYOUT_KEY = 'logical.io-lab-dock-layout.v1';

export function loadDockLayout() {
  try {
    const v = localStorage.getItem(DOCK_LAYOUT_KEY);
    if (v === 'below' || v === 'side' || v === 'hidden') return v;
  } catch { /* ignore */ }
  return null;
}

export function saveDockLayout(layout) {
  try { localStorage.setItem(DOCK_LAYOUT_KEY, layout); } catch { /* ignore */ }
}

function tagsFromBus(panel, bus) {
  return applyBusToPanel(panel, bus).tags;
}

function DockRow({ hot, control, label, tag }) {
  return (
    <div className={`lab-dock-row ${hot ? 'is-focus' : ''}`}>
      <div className="lab-dock-row-control">{control}</div>
      <div className="lab-dock-row-text">
        <span className="lab-dock-led-label">{label}</span>
        <span className="lab-dock-led-tag">{tag}</span>
      </div>
    </div>
  );
}

/**
 * Compact soft panel for a rung entry — generated from payload I/O, driven by the shared tag bus.
 * `emphasizeTags` (from scenario dockTags) highlights (and with focusOnly, filters) the tags in try-this.
 * List rows show the full teaching name + full tag — no ellipsis on hot labels.
 */
export function IoLabDock({ entry, io = [], layout, onLayoutChange, emphasizeTags = [], focusOnly = false }) {
  const focus = useMemo(() => new Set(emphasizeTags.filter(Boolean)), [emphasizeTags]);
  const linked = useMemo(() => ({
    entryId: entry?.id,
    title: entry?.title,
    io
  }), [entry?.id, entry?.title, io]);

  const panel = useMemo(
    () => applyBusToPanel(createPanelFromLadderIo(linked), loadTagBus()),
    [linked]
  );

  const [tags, setTags] = useState(() => panel.tags);

  useEffect(() => {
    setTags(tagsFromBus(panel, loadTagBus()));
  }, [panel]);

  useEffect(() => {
    const unsub = subscribeTagBus((bus, source) => {
      if (!isCouplingEnabled()) return;
      if (source === 'dock') return;
      setTags(tagsFromBus(panel, bus));
    });
    return unsub;
  }, [panel]);

  const publishTags = (nextTags) => {
    setTags(nextTags);
    if (!isCouplingEnabled()) return;
    const bits = {};
    const values = {};
    for (const w of panel.widgets) {
      if (w.type === 'pot') values[w.tag] = Number(nextTags[w.tag]) || 0;
      else bits[w.tag] = nextTags[w.tag] ? 1 : 0;
    }
    publishSnapshot({ bits, values }, 'dock');
  };

  const setBool = (tag, on) => {
    const next = { ...tags, [tag]: !!on };
    publishTags(next);
    setBit(tag, on, 'dock');
  };

  const setNum = (tag, n) => {
    const next = { ...tags, [tag]: Number(n) || 0 };
    publishTags(next);
    setValue(tag, next[tag], 'dock');
  };

  const doLampTest = (on) => {
    const lit = lampTest({ ...panel, tags }, on);
    publishTags(lit.tags);
  };

  if (!panel.widgets.length) {
    return (
      <aside className="lab-dock card">
        <div className="card-hd"><h3>Practice panel</h3><span className="hd-note">no switches on this rung</span></div>
        <div className="card-bd"><p className="small muted" style={{ margin: 0 }}>This rung has no switches or lamps to show on the panel.</p></div>
      </aside>
    );
  }

  const visible = (w) => !focusOnly || focus.size === 0 || focus.has(w.tag);
  const inputs = panel.widgets.filter((w) => (w.type === 'switch' || w.type === 'pb') && visible(w));
  const leds = panel.widgets.filter((w) => w.type === 'led' && visible(w));
  const pots = panel.widgets.filter((w) => w.type === 'pot' && visible(w));
  const sandboxHref = `/io-sandbox?adopt=1&entry=${encodeURIComponent(entry?.id || '')}`;
  const filtered = focusOnly && focus.size > 0;
  const useList = preferDockList({
    focusOnly,
    dockTags: emphasizeTags,
    io
  }) || layout === 'below';

  const renderLed = (w) => {
    const on = !!tags[w.tag];
    const hot = focus.has(w.tag);
    const control = (
      <button
        type="button"
        className={`lab-dock-led vios-led-${w.color || 'green'} ${on ? 'is-on' : ''} ${hot && !useList ? 'is-focus' : ''}`}
        aria-pressed={on}
        aria-label={`${w.label} (${w.tag})`}
        title={`${w.label} (${w.tag}) — force`}
        onClick={() => setBool(w.tag, !on)}
      >
        <span className="lab-dock-led-disc" />
        {!useList && (
          <>
            <span className="lab-dock-led-label">{w.label}</span>
            <span className="lab-dock-led-tag">{w.tag}</span>
          </>
        )}
      </button>
    );
    if (!useList) return <div key={w.id}>{control}</div>;
    return <DockRow key={w.id} hot={hot} control={control} label={w.label} tag={w.tag} />;
  };

  const renderInput = (w) => {
    const on = !!tags[w.tag];
    const hot = focus.has(w.tag);
    let control;
    if (w.type === 'pb') {
      control = (
        <button
          type="button"
          className={`lab-dock-pb ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          aria-label={w.label}
          onPointerDown={(e) => { e.preventDefault(); setBool(w.tag, true); }}
          onPointerUp={() => setBool(w.tag, false)}
          onPointerLeave={() => { if (on) setBool(w.tag, false); }}
        />
      );
    } else {
      control = (
        <button
          type="button"
          className={`lab-dock-toggle ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          aria-label={w.label}
          onClick={() => setBool(w.tag, !on)}
        >
          <span className="lab-dock-toggle-knob" />
        </button>
      );
    }
    if (useList) {
      return <DockRow key={w.id} hot={hot} control={control} label={w.label} tag={w.tag} />;
    }
    return (
      <div key={w.id} className={`lab-dock-cell ${hot ? 'is-focus' : ''}`}>
        {control}
        <span className="lab-dock-led-label">{w.label}</span>
        <span className="lab-dock-led-tag">{w.tag}</span>
      </div>
    );
  };

  const sectionClass = useList ? 'lab-dock-list' : 'lab-dock-grid';

  return (
    <aside className={`lab-dock card ${useList ? 'lab-dock-list-mode' : ''}`} aria-label="Practice panel for this rung">
      <div className="card-hd">
        <h3>Practice panel</h3>
        <span className="hd-note">{filtered ? 'tags for this step' : 'this rung’s switches and lamps'}</span>
      </div>
      <div className="card-bd stack" style={{ gap: 10 }}>
        <div className="lab-dock-toolbar">
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {['side', 'below', 'hidden'].map((opt) => (
              <button
                key={opt}
                type="button"
                className="chip"
                aria-pressed={layout === opt}
                onClick={() => onLayoutChange?.(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className="btn btn-sm" onClick={() => doLampTest(true)}>Lamp test</button>
            <button type="button" className="btn btn-sm" onClick={() => doLampTest(false)}>Off</button>
          </div>
        </div>

        {leds.length > 0 && (
          <div>
            <h4 className="mini">Lamps</h4>
            <div className={sectionClass}>{leds.map(renderLed)}</div>
          </div>
        )}

        {inputs.length > 0 && (
          <div>
            <h4 className="mini">Inputs</h4>
            <div className={sectionClass}>{inputs.map(renderInput)}</div>
          </div>
        )}

        {pots.length > 0 && (
          <div>
            <h4 className="mini">Analogs</h4>
            <div className={useList ? 'lab-dock-list' : 'stack'} style={useList ? undefined : { gap: 8 }}>
              {pots.map((w) => (
                useList ? (
                  <DockRow
                    key={w.id}
                    hot={focus.has(w.tag)}
                    label={w.label}
                    tag={`${w.tag} · ${Math.round(Number(tags[w.tag]) || 0)}`}
                    control={(
                      <input
                        type="range"
                        min={w.min ?? 0}
                        max={w.max ?? 100}
                        value={Number(tags[w.tag]) || 0}
                        aria-label={w.label}
                        onChange={(e) => setNum(w.tag, e.target.value)}
                      />
                    )}
                  />
                ) : (
                  <label key={w.id} className="lab-dock-pot">
                    <span className="lab-dock-led-label">{w.label}</span>
                    <input
                      type="range"
                      min={w.min ?? 0}
                      max={w.max ?? 100}
                      value={Number(tags[w.tag]) || 0}
                      onChange={(e) => setNum(w.tag, e.target.value)}
                    />
                    <span className="lab-dock-led-tag">{w.tag} · {Math.round(Number(tags[w.tag]) || 0)}</span>
                  </label>
                )
              ))}
            </div>
          </div>
        )}

        <div className="vios-couple-bar" style={{ margin: 0 }}>
          <Link className="btn btn-sm btn-primary" to={sandboxHref}>Open full I/O sandbox →</Link>
          <span className="tiny muted">
            Teaching model — shared browser tags with the scan sim. Not live field I/O.
          </span>
        </div>
      </div>
    </aside>
  );
}
