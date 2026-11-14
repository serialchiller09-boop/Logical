import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { applyBusToPanel, createPanelFromLadderIo, lampTest } from '../lib/ioSandbox.js';
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
  return 'side';
}

export function saveDockLayout(layout) {
  try { localStorage.setItem(DOCK_LAYOUT_KEY, layout); } catch { /* ignore */ }
}

function tagsFromBus(panel, bus) {
  return applyBusToPanel(panel, bus).tags;
}

/**
 * Compact soft panel for a rung entry — generated from payload I/O, driven by the shared tag bus.
 */
export function IoLabDock({ entry, io = [], layout, onLayoutChange }) {
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
        <div className="card-hd"><h3>Soft panel</h3><span className="hd-note">no I/O on this rung</span></div>
        <div className="card-bd"><p className="small muted" style={{ margin: 0 }}>This entry has no declared I/O points for the dock.</p></div>
      </aside>
    );
  }

  const inputs = panel.widgets.filter((w) => w.type === 'switch' || w.type === 'pb');
  const leds = panel.widgets.filter((w) => w.type === 'led');
  const pots = panel.widgets.filter((w) => w.type === 'pot');
  const sandboxHref = `/io-sandbox?adopt=1&entry=${encodeURIComponent(entry?.id || '')}`;

  return (
    <aside className="lab-dock card" aria-label="Soft I/O panel for this rung">
      <div className="card-hd">
        <h3>Soft panel</h3>
        <span className="hd-note">this rung’s I/O</span>
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
            <div className="lab-dock-grid">
              {leds.map((w) => {
                const on = !!tags[w.tag];
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`lab-dock-led vios-led-${w.color || 'green'} ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    title={`${w.label} (${w.tag}) — force`}
                    onClick={() => setBool(w.tag, !on)}
                  >
                    <span className="lab-dock-led-disc" />
                    <span className="lab-dock-led-label">{w.label}</span>
                    <span className="lab-dock-led-tag">{w.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {inputs.length > 0 && (
          <div>
            <h4 className="mini">Inputs</h4>
            <div className="lab-dock-grid">
              {inputs.map((w) => {
                const on = !!tags[w.tag];
                if (w.type === 'pb') {
                  return (
                    <div key={w.id} className="lab-dock-cell">
                      <button
                        type="button"
                        className={`lab-dock-pb ${on ? 'is-on' : ''}`}
                        aria-pressed={on}
                        aria-label={w.label}
                        onPointerDown={(e) => { e.preventDefault(); setBool(w.tag, true); }}
                        onPointerUp={() => setBool(w.tag, false)}
                        onPointerLeave={() => { if (on) setBool(w.tag, false); }}
                      />
                      <span className="lab-dock-led-label">{w.label}</span>
                      <span className="lab-dock-led-tag">{w.tag}</span>
                    </div>
                  );
                }
                return (
                  <div key={w.id} className="lab-dock-cell">
                    <button
                      type="button"
                      className={`lab-dock-toggle ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      aria-label={w.label}
                      onClick={() => setBool(w.tag, !on)}
                    >
                      <span className="lab-dock-toggle-knob" />
                    </button>
                    <span className="lab-dock-led-label">{w.label}</span>
                    <span className="lab-dock-led-tag">{w.tag}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pots.length > 0 && (
          <div>
            <h4 className="mini">Analogs</h4>
            <div className="stack" style={{ gap: 8 }}>
              {pots.map((w) => (
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
