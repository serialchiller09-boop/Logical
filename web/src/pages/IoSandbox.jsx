import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTitle } from '../lib/store.jsx';
import {
  WIDGET_TYPES,
  LED_COLORS,
  LAMP_TEST_TAG,
  addWidget,
  clearPanelStorage,
  countByType,
  createStarterPanel,
  createTrainerPanel,
  lampTest,
  loadPanel,
  moveWidget,
  panelToCsv,
  removeWidget,
  renameWidget,
  savePanel,
  setTag
} from '../lib/ioSandbox.js';

function WidgetShell({ widget, selected, onSelect, children }) {
  return (
    <div
      className={`vios-widget vios-${widget.type} ${selected ? 'is-selected' : ''}`}
      style={{
        gridColumn: `${(widget.x || 0) + 1} / span ${widget.type === 'pot' ? 3 : widget.type === 'led' ? 1 : 2}`,
        gridRow: (widget.y || 0) + 1
      }}
      data-widget-id={widget.id}
      title={widget.channel ? `${widget.channel} · ${widget.studio || ''}` : undefined}
      onClick={(e) => { e.stopPropagation(); onSelect(widget.id); }}
    >
      {children}
    </div>
  );
}

function LedWidget({ widget, on, onToggle, selected, onSelect }) {
  const force = () => { onSelect(widget.id); onToggle(!on); };
  return (
    <WidgetShell widget={widget} selected={selected} onSelect={() => force()}>
      <button
        type="button"
        className={`vios-led vios-led-${widget.color || 'green'} ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        aria-label={`${widget.label} ${on ? 'on' : 'off'}`}
        onClick={(e) => { e.stopPropagation(); force(); }}
        title="Force lamp (panel-only)"
      />
      <span className="vios-caption">{widget.label}</span>
      <span className="vios-tag">{widget.channel ? `${widget.channel} · ${widget.tag}` : widget.tag}</span>
    </WidgetShell>
  );
}

function SwitchWidget({ widget, on, onToggle, selected, onSelect }) {
  return (
    <WidgetShell widget={widget} selected={selected} onSelect={onSelect}>
      <button
        type="button"
        className={`vios-toggle ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        aria-label={`${widget.label} ${on ? 'on' : 'off'}`}
        onClick={(e) => { e.stopPropagation(); onSelect(widget.id); onToggle(!on); }}
      >
        <span className="vios-toggle-knob" />
      </button>
      <span className="vios-caption">{widget.label}</span>
      <span className="vios-tag">{widget.channel ? `${widget.channel} · ${widget.tag}` : widget.tag}</span>
    </WidgetShell>
  );
}

function PbWidget({ widget, on, onDown, onUp, selected, onSelect }) {
  return (
    <WidgetShell widget={widget} selected={selected} onSelect={onSelect}>
      <button
        type="button"
        className={`vios-pb ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        aria-label={widget.label}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(widget.id); onDown(); }}
        onPointerUp={(e) => { e.stopPropagation(); onUp(); }}
        onPointerLeave={() => { if (on) onUp(); }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onDown(); }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onUp(); }
        }}
      />
      <span className="vios-caption">{widget.label}</span>
      <span className="vios-tag">{widget.channel ? `${widget.channel} · ${widget.tag}` : widget.tag}</span>
    </WidgetShell>
  );
}

function PotWidget({ widget, value, onChange, selected, onSelect }) {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  return (
    <WidgetShell widget={widget} selected={selected} onSelect={onSelect}>
      <div className="vios-pot" onClick={(e) => e.stopPropagation()}>
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={value}
          aria-label={widget.label}
          onFocus={() => onSelect(widget.id)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="vios-pot-val">{Math.round(value)}%</span>
      </div>
      <span className="vios-caption">{widget.label}</span>
      <span className="vios-tag">{widget.channel ? `${widget.channel} · ${widget.tag}` : widget.tag}</span>
    </WidgetShell>
  );
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function IoSandbox() {
  useTitle('I/O sandbox');
  const [panel, setPanel] = useState(() => loadPanel());
  const [selectedId, setSelectedId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editColor, setEditColor] = useState('green');
  const [savedFlash, setSavedFlash] = useState(false);
  const persistTimer = useRef(null);

  const counts = useMemo(() => countByType(panel), [panel]);
  const selected = panel.widgets.find((w) => w.id === selectedId) || null;
  const maxRow = panel.widgets.reduce((m, w) => Math.max(m, w.y || 0), 0);
  const gridRows = Math.max(4, maxRow + 2);
  const modeLabel = panel.mode === 'trainer' ? 'SUB-TRAIN-01' : 'BLANK PANEL';

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      if (savePanel(panel)) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 900);
      }
    }, 200);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [panel]);

  useEffect(() => {
    if (!selected) {
      setEditLabel('');
      setEditTag('');
      setEditColor('green');
      return;
    }
    setEditLabel(selected.label);
    setEditTag(selected.tag);
    setEditColor(selected.color || 'green');
  }, [selectedId, selected?.label, selected?.tag, selected?.color]);

  const update = (fn) => setPanel((p) => fn(p));

  const applyRename = () => {
    if (!selected) return;
    update((p) => renameWidget(p, selected.id, { label: editLabel, tag: editTag, color: editColor }));
  };

  const loadBlank = () => {
    clearPanelStorage();
    setSelectedId(null);
    setPanel(createStarterPanel());
  };

  const loadTrainer = () => {
    setSelectedId(null);
    setPanel(createTrainerPanel());
  };

  const pressPb = (tag, down) => {
    update((p) => {
      let next = setTag(p, tag, down);
      if (tag === LAMP_TEST_TAG) next = lampTest(next, down);
      return next;
    });
  };

  return (
    <>
      <section className="hero">
        <h1>I/O sandbox</h1>
        <p className="hero-lead">
          Soft trainer panel — blank layout or the Substation SUB-TRAIN-01 I/O map.
          Tags live in this browser only. Ladder lab coupling comes later.
        </p>
        <div className="hero-meta">
          <span className="pill"><b className="num">{counts.led}</b> LEDs</span>
          <span className="pill"><b className="num">{counts.switch}</b> switches</span>
          <span className="pill"><b className="num">{counts.pb}</b> PBs</span>
          <span className="pill"><b className="num">{counts.pot}</b> pots</span>
          <span className={`pill ${panel.mode === 'trainer' ? 'pill-accent' : ''}`}>{modeLabel}</span>
          <span className={`pill ${savedFlash ? 'pill-accent' : ''}`}>{savedFlash ? 'saved' : 'localStorage'}</span>
        </div>
      </section>

      <div className="vios-toolbar">
        <div className="vios-add-group" role="group" aria-label="Add widgets">
          <button type="button" className="btn" onClick={() => update((p) => addWidget(p, 'led'))}>+ LED</button>
          <button type="button" className="btn" onClick={() => update((p) => addWidget(p, 'switch'))}>+ Switch</button>
          <button type="button" className="btn" onClick={() => update((p) => addWidget(p, 'pb'))}>+ PB</button>
          <button type="button" className="btn" onClick={() => update((p) => addWidget(p, 'pot'))}>+ Pot</button>
        </div>
        <div className="vios-add-group">
          <button type="button" className="btn btn-primary" onClick={loadTrainer}>Load trainer preset</button>
          <button type="button" className="btn" onClick={loadBlank}>Blank starter</button>
          <button type="button" className="btn" onClick={() => update((p) => lampTest(p, true))}>Lamp test</button>
          <button type="button" className="btn" onClick={() => update((p) => lampTest(p, false))}>Lamps off</button>
          <button
            type="button"
            className="btn"
            onClick={() => downloadText('logical-io-sandbox.csv', panelToCsv(panel), 'text/csv;charset=utf-8')}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="vios-layout">
        <div className="vios-plate" role="region" aria-label="Virtual I/O panel">
          <div className="vios-plate-bezel">
            <div className="vios-plate-title">
              <span>LOGICAL · VIRTUAL I/O</span>
              <span className="vios-plate-mode">{modeLabel}</span>
            </div>
            <div
              className="vios-grid"
              style={{ gridTemplateRows: `repeat(${gridRows}, minmax(88px, auto))` }}
              onClick={() => setSelectedId(null)}
            >
              {panel.widgets.map((w) => {
                const val = panel.tags[w.tag];
                const common = {
                  widget: w,
                  selected: selectedId === w.id,
                  onSelect: (id) => setSelectedId(id)
                };
                if (w.type === 'led') {
                  return (
                    <LedWidget
                      key={w.id}
                      {...common}
                      on={!!val}
                      onToggle={(on) => update((p) => setTag(p, w.tag, on))}
                    />
                  );
                }
                if (w.type === 'switch') {
                  return (
                    <SwitchWidget
                      key={w.id}
                      {...common}
                      on={!!val}
                      onToggle={(on) => update((p) => setTag(p, w.tag, on))}
                    />
                  );
                }
                if (w.type === 'pb') {
                  return (
                    <PbWidget
                      key={w.id}
                      {...common}
                      on={!!val}
                      onDown={() => pressPb(w.tag, true)}
                      onUp={() => pressPb(w.tag, false)}
                    />
                  );
                }
                return (
                  <PotWidget
                    key={w.id}
                    {...common}
                    value={typeof val === 'number' ? val : 0}
                    onChange={(n) => update((p) => setTag(p, w.tag, n))}
                  />
                );
              })}
            </div>
            <p className="vios-plate-foot">
              Teaching model — not a PLC scan, not live field wiring.
              {panel.mode === 'trainer'
                ? ' Addresses match the Substation notebook TRAINER_IO map (example Studio / RSLogix columns).'
                : ' Load the trainer preset for the full SUB-TRAIN-01 point list.'}
              {' '}Ladder coupling later.
            </p>
          </div>
        </div>

        <aside className="vios-side">
          <div className="card">
            <div className="card-hd">
              <h3>Inspector</h3>
              <span className="hd-note">{selected ? WIDGET_TYPES[selected.type]?.label : 'select a widget'}</span>
            </div>
            <div className="card-bd stack" style={{ gap: 10 }}>
              {!selected && (
                <p className="small muted" style={{ margin: 0 }}>
                  Click a device on the plate to rename it, re-tag it, nudge its slot, or remove it.
                </p>
              )}
              {selected && (
                <>
                  <label className="field">
                    Label
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={applyRename} />
                  </label>
                  <label className="field">
                    Tag
                    <input className="mono" value={editTag} onChange={(e) => setEditTag(e.target.value)} onBlur={applyRename} />
                  </label>
                  {selected.type === 'led' && (
                    <label className="field">
                      Lamp color
                      <select value={editColor} onChange={(e) => { setEditColor(e.target.value); update((p) => renameWidget(p, selected.id, { color: e.target.value })); }}>
                        {LED_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                  )}
                  {(selected.channel || selected.studio || selected.rslogix) && (
                    <div className="vios-addr-block">
                      {selected.channel && <div><span className="muted">Channel</span> <code>{selected.channel}</code></div>}
                      {selected.studio && <div><span className="muted">Studio</span> <code>{selected.studio}</code></div>}
                      {selected.rslogix && <div><span className="muted">RSLogix</span> <code>{selected.rslogix}</code></div>}
                      {selected.engineering && <div><span className="muted">Eng</span> <code>{selected.engineering}</code></div>}
                      {selected.note && <p className="tiny muted" style={{ margin: '6px 0 0' }}>{selected.note}</p>}
                    </div>
                  )}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn" onClick={() => update((p) => moveWidget(p, selected.id, -1, 0))} aria-label="Move left">←</button>
                    <button type="button" className="btn" onClick={() => update((p) => moveWidget(p, selected.id, 1, 0))} aria-label="Move right">→</button>
                    <button type="button" className="btn" onClick={() => update((p) => moveWidget(p, selected.id, 0, -1))} aria-label="Move up">↑</button>
                    <button type="button" className="btn" onClick={() => update((p) => moveWidget(p, selected.id, 0, 1))} aria-label="Move down">↓</button>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      update((p) => removeWidget(p, selected.id));
                      setSelectedId(null);
                    }}
                  >
                    Remove widget
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><h3>Tag table</h3><span className="hd-note">this browser</span></div>
            <div className="card-bd">
              <div className="vios-tag-table">
                {Object.keys(panel.tags).sort().map((tag) => {
                  const v = panel.tags[tag];
                  return (
                    <div key={tag} className="vios-tag-row">
                      <code>{tag}</code>
                      <span>{typeof v === 'number' ? `${Math.round(v)}%` : (v ? 'TRUE' : 'false')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="callout callout-info">
            <h4>Where this sits</h4>
            <div>
              Blank starter or interactive face of the{' '}
              <Link to="/notebook">Substation notebook</Link> trainer map.
              Ladder lab stays independent for now — open a rung in the{' '}
              <Link to="/s/rungs">ladder lab</Link> separately.
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
