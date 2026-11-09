import { useCallback, useMemo, useState } from 'react';
import { useApp, useTitle } from '../lib/store.jsx';
import {
  ALL_IO_ROWS,
  ASSUMED_TOPOLOGY,
  BUILD_PHASES,
  CONTROLLER_BASIS,
  DRAWING_OBSERVATIONS,
  FAT_TESTS,
  HMI_SCREENS,
  INTERNAL_TAGS,
  KIRK_STATES,
  LOGIC_PATTERNS,
  PERMISSIVE_MATRIX,
  PLATFORM_CROSSWALK,
  PROGRAM_ROUTINES,
  PROJECT_ID,
  REFERENCE_LINKS,
  TIMER_COUNTER_PLAN,
  TRAINER_IO,
  WONDERWARE_STEPS
} from '../data/substationProject.js';

const STORE = 'logical.substationNotebook.v1';
const FIELDS_STORE = 'logical.substationNotebook.fields.v1';

const CHAPTERS = [
  { id: 'basis', n: '01', label: 'Design basis' },
  { id: 'plan', n: '02', label: 'Build plan' },
  { id: 'io', n: '03', label: 'Trainer I/O' },
  { id: 'logic', n: '04', label: 'PLC logic' },
  { id: 'kirk', n: '05', label: 'Kirk key' },
  { id: 'hmi', n: '06', label: 'Wonderware HMI' },
  { id: 'fat', n: '07', label: 'FAT & handoff' },
  { id: 'sources', n: '08', label: 'References' }
];

const DEFAULT_FIELDS = {
  projectName: 'Substation PLC simulator & trainer',
  drawing: 'ADD ACTUAL ONE-LINE NUMBER / REVISION',
  controller: 'CompactLogix L18ER — confirm 1769-L18ER-BB1B and firmware',
  toolchain: 'Studio 5000 Logix Designer — record exact revision',
  hmi: 'Wonderware / AVEVA InTouch version to be recorded',
  trainerPower: 'VERIFY voltage, commons, source/sink and isolation',
  preparedBy: '',
  reviewDate: ''
};

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : fallback;
  } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* browser storage can be unavailable */ }
}

function csvCell(value) {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${str.replace(/"/g, '""')}"`;
}

function downloadIoCsv() {
  const columns = ['group', 'channel', 'tag', 'studio', 'rslogix', 'device', 'normal', 'action', 'engineering', 'note'];
  const body = [columns.join(','), ...ALL_IO_ROWS.map((row) => columns.map((c) => csvCell(row[c])).join(','))].join('\r\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${PROJECT_ID.toLowerCase()}-io-map.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OneLineDiagram() {
  return (
    <div className="oneline-wrap" role="img" aria-label="Drawing-informed training one-line: 138 kilovolt source, high-side switching, main transformer, 4.16 kilovolt main and bus, monitored feeders and motors, and four capacitor banks">
      <svg className="oneline" viewBox="0 0 1020 430">
        <title>Drawing-informed 138/4.16 kV training subset</title>
        <desc>The uploaded Duke Energy one-line is normalized into a trainer model with incoming high-side status, one main transformer, one 4.16 kV main breaker, feeder and motor monitoring, and four independent capacitor-bank breakers with K1 through K4.</desc>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        <g className="ol-wire">
          <line x1="54" y1="92" x2="116" y2="92" />
          <line x1="164" y1="92" x2="214" y2="92" />
          <line x1="277" y1="92" x2="336" y2="92" />
          <line x1="384" y1="92" x2="970" y2="92" className="ol-bus" />
          <line x1="466" y1="92" x2="466" y2="190" />
          <line x1="565" y1="92" x2="565" y2="190" />
          <line x1="655" y1="92" x2="655" y2="271" />
          <line x1="755" y1="92" x2="755" y2="271" />
          <line x1="855" y1="92" x2="855" y2="271" />
          <line x1="955" y1="92" x2="955" y2="271" />
          <line x1="655" y1="313" x2="655" y2="355" />
          <line x1="755" y1="313" x2="755" y2="355" />
          <line x1="855" y1="313" x2="855" y2="355" />
          <line x1="955" y1="313" x2="955" y2="355" />
        </g>

        <g className="ol-source">
          <circle cx="38" cy="92" r="16" />
          <path d="M26 92c5-9 9 9 14 0s9 9 14 0" />
          <text x="20" y="55">138 kV SOURCE</text><text x="20" y="70" className="ol-sub">DRAWING OBSERVED</text>
        </g>

        <g className="ol-breaker" transform="translate(140 92) rotate(90)">
          <rect x="-24" y="-20" width="48" height="40" rx="5" />
          <line x1="-12" y1="10" x2="12" y2="-10" />
        </g>
        <text x="140" y="52" textAnchor="middle">HV SWITCHING</text><text x="140" y="68" textAnchor="middle" className="ol-sub">EXACT TAG PENDING</text>

        <g className="ol-xfmr" transform="translate(245 92) rotate(90)">
          <circle cx="0" cy="-11" r="21" /><circle cx="0" cy="13" r="21" />
        </g>
        <text x="245" y="44" textAnchor="middle">XFMR_MAIN</text><text x="245" y="60" textAnchor="middle" className="ol-sub">138 / 4.16 kV</text>

        <g className="ol-breaker" transform="translate(360 92) rotate(90)">
          <rect x="-24" y="-20" width="48" height="40" rx="5" />
          <line x1="-12" y1="10" x2="12" y2="-10" />
        </g>
        <text x="360" y="44" textAnchor="middle">CB_MAIN</text><text x="360" y="60" textAnchor="middle" className="ol-sub">NORMALIZED TRAINER TAG</text>
        <text x="690" y="79" textAnchor="middle">BUS_4KV · 4.16 kV</text>

        <g className="ol-relay" transform="translate(705 24)">
          <rect x="-86" y="-17" width="172" height="34" rx="7" />
          <text textAnchor="middle" y="-2">SEL / CT / 86 INPUTS</text><text textAnchor="middle" y="12" className="ol-sub">PROTECTION REMAINS RELAY-OWNED</text>
          <path d="M0 17V53" strokeDasharray="5 5" />
        </g>

        <g className="ol-relay" transform="translate(466 213)">
          <rect x="-58" y="-23" width="116" height="46" rx="7" />
          <text textAnchor="middle" y="-2">FEEDERS A–C</text><text textAnchor="middle" y="13" className="ol-sub">+ CLOUDED ADDITIONS</text>
        </g>
        <g className="ol-relay" transform="translate(565 213)">
          <rect x="-43" y="-23" width="86" height="46" rx="7" />
          <text textAnchor="middle" y="-2">MOTOR / LOAD</text><text textAnchor="middle" y="13" className="ol-sub">MONITOR ONLY</text>
        </g>

        {[655, 755, 855, 955].map((x, i) => (
          <g key={x}>
            <g className="ol-breaker" transform={`translate(${x} 292)`}>
              <rect x="-22" y="-20" width="44" height="40" rx="5" />
              <line x1="-11" y1="10" x2="11" y2="-10" />
            </g>
            <text x={x} y="255" textAnchor="middle">CB_CAP{i + 1}</text>
            <text x={x} y="332" textAnchor="middle" className="ol-sub">K{i + 1} KEY</text>
            <g className="ol-cap" transform={`translate(${x} 371)`}>
              <line x1="-16" y1="-10" x2="16" y2="-10" /><line x1="-16" y1="3" x2="16" y2="3" /><line x1="0" y1="3" x2="0" y2="19" />
            </g>
            <text x={x} y="412" textAnchor="middle">CAP-{i + 1}</text>
          </g>
        ))}

        <text x="20" y="410" className="ol-note">DRAWING-INFORMED TRAINER SUBSET · DEVICE TAGS / RATINGS REQUIRE ORIGINAL PDF</text>
      </svg>
    </div>
  );
}

function Table({ columns, rows, compact = false }) {
  return (
    <div className="notebook-table-wrap">
      <table className={`tbl notebook-table ${compact ? 'compact' : ''}`}>
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.tag || `${row.channel}-${i}`}>
              {columns.map((c) => <td key={c.key} className={c.mono ? 'mono' : ''}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckRow({ id, checked, onToggle, children }) {
  return (
    <label className={`notebook-check ${checked ? 'done' : ''}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
      <span className="notebook-box" aria-hidden>{checked ? '✓' : ''}</span>
      <span>{children}</span>
    </label>
  );
}

function PhaseCard({ phase, checked, onToggle }) {
  const count = phase.tasks.filter((_, i) => checked[`${phase.id}-${i}`]).length;
  return (
    <article className="phase-card">
      <div className="phase-index">{phase.number}</div>
      <div className="phase-content">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div><h3>{phase.title}</h3><p className="phase-outcome">Outcome — {phase.outcome}</p></div>
          <span className={`phase-count ${count === phase.tasks.length ? 'complete' : ''}`}>{count}/{phase.tasks.length}</span>
        </div>
        <div className="phase-tasks">
          {phase.tasks.map((task, i) => <CheckRow key={i} id={`${phase.id}-${i}`} checked={!!checked[`${phase.id}-${i}`]} onToggle={onToggle}>{task}</CheckRow>)}
        </div>
        <div className="phase-evidence"><b>Evidence to keep</b><span>{phase.evidence}</span></div>
      </div>
    </article>
  );
}

function ChapterHead({ number, title, eyebrow, children }) {
  return (
    <div className="chapter-head">
      <span className="chapter-number">{number}</span>
      <div><div className="chapter-eyebrow">{eyebrow}</div><h2>{title}</h2>{children && <p>{children}</p>}</div>
    </div>
  );
}

function CodePattern({ pattern, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <article className="logic-pattern">
      <button className="logic-pattern-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span><small>Pattern {String(index + 1).padStart(2, '0')}</small><b>{pattern.title}</b></span>
        <span>{open ? '−' : '+'}</span>
      </button>
      <div className={`logic-pattern-body ${open ? 'open' : ''}`}>
        <p>{pattern.why}</p>
        <div className="formula logic-code">{pattern.studio.join('\n')}</div>
        <div className="cross-note"><b>RSLogix 500 translation</b>{pattern.rslogix}</div>
      </div>
    </article>
  );
}

export default function ProjectNotebook() {
  useTitle('Substation project notebook');
  const { toast } = useApp();
  const [checked, setChecked] = useState(() => load(STORE, {}));
  const [fields, setFields] = useState(() => ({ ...DEFAULT_FIELDS, ...load(FIELDS_STORE, {}) }));

  const allTaskIds = useMemo(() => BUILD_PHASES.flatMap((p) => p.tasks.map((_, i) => `${p.id}-${i}`)), []);
  const complete = allTaskIds.filter((id) => checked[id]).length;
  const pct = Math.round((complete / allTaskIds.length) * 100);

  const toggle = useCallback((id) => {
    setChecked((old) => {
      const next = { ...old, [id]: !old[id] };
      save(STORE, next);
      return next;
    });
  }, []);

  const updateField = (key, value) => {
    setFields((old) => {
      const next = { ...old, [key]: value };
      save(FIELDS_STORE, next);
      return next;
    });
  };

  const reset = () => {
    if (!window.confirm('Clear all notebook checkmarks? Project fields and notes will remain.')) return;
    setChecked({});
    save(STORE, {});
    toast('notebook progress cleared', 'ok');
  };

  const ioColumns = [
    { key: 'channel', label: 'Point', mono: true },
    { key: 'tag', label: 'PLC tag / symbol', mono: true },
    { key: 'studio', label: 'Studio 5000 example', mono: true },
    { key: 'rslogix', label: 'RSLogix 500 example', mono: true },
    { key: 'device', label: 'Trainer label' },
    { key: 'normal', label: 'Normal' },
    { key: 'note', label: 'Design note', render: (v, row) => v || row.action || row.engineering || '' }
  ];

  return (
    <div className="notebook-page">
      <section className="notebook-hero">
        <div className="notebook-kicker"><span className="status-lamp" /> PROJECT NOTEBOOK · {PROJECT_ID}</div>
        <h1>Substation PLC simulator<br /><em>from one-line to trainer</em></h1>
        <p>
          A buildable learning project for Studio 5000 or RSLogix 500 with a Wonderware / AVEVA HMI,
          organized around the uploaded 138/4.16 kV one-line: high-side and transformer supervision, the 4.16 kV
          main/bus, feeder and motor monitoring, four Kirk-keyed capacitor banks, permissives, timers, counters and one-shots.
        </p>
        <div className="notebook-actions">
          <a href="#plan" className="btn btn-primary">Start the build plan ↓</a>
          <button className="btn btn-ghost" onClick={() => window.print()}>⎙ Print / save PDF</button>
          <button className="btn btn-ghost" onClick={downloadIoCsv}>⇩ Export I/O CSV</button>
        </div>
        <div className="notebook-progress-block">
          <div className="row spread"><span>{complete} of {allTaskIds.length} build checks complete</span><b className="num">{pct}%</b></div>
          <div className="notebook-progress"><span style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      <div className="safety-banner">
        <div className="safety-icon">!</div>
        <div>
          <b>TRAINING MODEL — NOT PROTECTION OR A SWITCHING PROCEDURE</b>
          <span>
            Keep this project software-only or on an isolated low-voltage trainer. A standard PLC must not replace a
            protective relay, hardwired trip, mechanical Kirk interlock, approved discharge/grounding method, or absence-of-voltage test.
            Never open an energized CT secondary and never connect the proposed trainer directly to substation CT/VT circuits.
          </span>
        </div>
      </div>

      <div className="notebook-layout">
        <aside className="notebook-toc">
          <div className="toc-label">Notebook</div>
          {CHAPTERS.map((c) => <a key={c.id} href={`#${c.id}`}><span>{c.n}</span>{c.label}</a>)}
          <div className="toc-progress"><span>Build progress</span><b>{pct}%</b></div>
          <button className="toc-reset" onClick={reset}>Reset checkmarks</button>
        </aside>

        <main className="notebook-main">
          <section className="notebook-chapter" id="basis">
            <ChapterHead number="01" eyebrow="Drawing received · transcription still controlled" title="Design basis">
              The uploaded screenshot establishes the 138/4.16 kV architecture and four capacitor-bank branches. Its
              resolution is not adequate for reliable character-by-character device tags, ratings or protection settings,
              so the notebook uses normalized simulator names and keeps exact transcription as an open document-control task.
            </ChapterHead>

            <div className="card drawing-review-card">
              <div className="card-hd"><h3>Uploaded one-line review</h3><span className="st st-practice">drawing-informed</span></div>
              <div className="card-bd"><Table rows={DRAWING_OBSERVATIONS} columns={[
                { key: 'area', label: 'Area' }, { key: 'observed', label: 'What is visible' },
                { key: 'confidence', label: 'Reading status' }, { key: 'action', label: 'Required confirmation' }
              ]} /></div>
            </div>

            <div className="basis-grid">
              <div className="card basis-form-card">
                <div className="card-hd"><h3>Project cover sheet</h3><span className="hd-note">saved in this browser</span></div>
                <div className="card-bd basis-form">
                  {[
                    ['projectName', 'Project'], ['drawing', 'One-line / revision'], ['controller', 'Controller / firmware'],
                    ['toolchain', 'Programming target'], ['hmi', 'HMI / comms version'], ['trainerPower', 'Trainer electrical basis'],
                    ['preparedBy', 'Prepared by'], ['reviewDate', 'Review date']
                  ].map(([key, label]) => <label key={key}><span>{label}</span><input type="text" value={fields[key]} onChange={(e) => updateField(key, e.target.value)} /></label>)}
                </div>
              </div>
              <div className="basis-stats">
                <div><b>15</b><span>maintained toggles</span></div>
                <div><b>15</b><span>momentary inputs</span></div>
                <div><b>2</b><span>analog pots</span></div>
                <div><b>8</b><span>LED outputs</span></div>
              </div>
            </div>

            <div className="card controller-basis-card">
              <div className="card-hd"><h3>CompactLogix L18ER fit check</h3><span className="st st-vendor">confirm full catalog</span></div>
              <div className="card-bd"><Table rows={CONTROLLER_BASIS} columns={[
                { key: 'item', label: 'Item' }, { key: 'selection', label: 'Current basis' }, { key: 'designEffect', label: 'Project effect' }
              ]} /></div>
            </div>

            <div className="card oneline-card">
              <div className="card-hd"><h3>Drawing-informed trainer subset</h3><span className="st st-site-specific">exact tags pending PDF</span></div>
              <div className="card-bd"><OneLineDiagram /></div>
            </div>

            <div className="card">
              <div className="card-hd"><h3>Device register</h3><span className="hd-note">the model boundary</span></div>
              <div className="card-bd">
                <Table compact rows={ASSUMED_TOPOLOGY} columns={[
                  { key: 'tag', label: 'Normalized simulator tag', mono: true }, { key: 'device', label: 'Drawing equipment' }, { key: 'role', label: 'Modeled role' }
                ]} />
              </div>
            </div>

            <div className="boundary-grid">
              <div className="boundary-card good"><span>PLC may own</span><b>training controls</b><p>Request arbitration, permissive display, simulator states, indication, counters, alarms and HMI handshakes.</p></div>
              <div className="boundary-card caution"><span>PLC may monitor</span><b>protection &amp; keys</b><p>Relay trips/health, breaker auxiliaries, key position, disconnect/access position and hardwired trip status.</p></div>
              <div className="boundary-card stop"><span>PLC does not replace</span><b>primary safety</b><p>Protective relay pickup, 86 hardware, breaker trip circuit, trapped-key mechanics, grounding or safe-work procedure.</p></div>
            </div>
          </section>

          <section className="notebook-chapter" id="plan">
            <ChapterHead number="02" eyebrow="Twelve gates from paper to FAT" title="Step-by-step build plan">
              Check a task only when its evidence exists. The order is intentional: trips execute before permissives,
              and the I/O/state model exists before the HMI.
            </ChapterHead>
            <div className="phase-list">
              {BUILD_PHASES.map((phase) => <PhaseCard key={phase.id} phase={phase} checked={checked} onToggle={toggle} />)}
            </div>
          </section>

          <section className="notebook-chapter" id="io">
            <ChapterHead number="03" eyebrow="Thirty-two inputs, eight outputs" title="L18ER trainer I/O map">
              Use the L18ER embedded I/O where the confirmed full catalog supports it, then add one compatible 16-point
              local POINT I/O input group for the momentary controls. Generated module addresses replace the examples below.
            </ChapterHead>

            <div className="io-allocation">
              {[
                ['Embedded DI', '15 × maintained', '1 spare'], ['POINT I/O DI', '15 × momentary', '1 spare'],
                ['Analog inputs', '2 × isolated pots', 'catalog check'], ['Embedded DO', '6 green + 2 amber', '8 spares']
              ].map(([slot, use, meta]) => <div key={slot}><span>{slot}</span><b>{use}</b><small>{meta}</small></div>)}
            </div>

            <div className="callout callout-warn">
              <h4>Before wiring</h4>
              <div>Verify input/output voltage, commons, source/sink type, analog signal mode, isolation, fusing and LED current against the exact PLC and trainer manuals. “Potentiometer” does not by itself identify a safe signal for an analog module.</div>
            </div>
            <div className="callout callout-info" style={{ marginTop: 10 }}>
              <h4>How four banks fit the available controls</h4>
              <div>M08–M11 prove the four breaker states and M12–M15 simulate K1–K4 at their breakers. P03–P10 provide each bank's close/open requests. Individual access/disconnect states and key-release requests remain HMI simulation points unless the trainer gains more inputs. Pot 1 proves current only for the bank selected on the HMI; every unselected bank is fail-blocked.</div>
            </div>

            {[
              ['15 maintained toggles', TRAINER_IO.maintained],
              ['15 momentary controls', TRAINER_IO.momentary],
              ['2 analog potentiometers', TRAINER_IO.analog],
              ['6 green LEDs', TRAINER_IO.green],
              ['2 amber LEDs', TRAINER_IO.amber]
            ].map(([title, rows]) => (
              <div className="card io-table-card" key={title}>
                <div className="card-hd"><h3>{title}</h3><span className="hd-note">{rows.length} assigned</span></div>
                <div className="card-bd"><Table rows={rows} columns={ioColumns} /></div>
              </div>
            ))}

            <div className="card">
              <div className="card-hd"><h3>Internal / HMI tag starter set</h3><span className="hd-note">separate raw I/O from equipment state</span></div>
              <div className="card-bd"><Table rows={INTERNAL_TAGS} columns={[
                { key: 'tag', label: 'Tag', mono: true }, { key: 'type', label: 'Type', mono: true }, { key: 'owner', label: 'Routine' }, { key: 'purpose', label: 'Purpose' }
              ]} /></div>
            </div>
          </section>

          <section className="notebook-chapter" id="logic">
            <ChapterHead number="04" eyebrow="Trip first, output map last" title="Controller structure & logic patterns">
              Build one active target first. Studio 5000 uses named tags and can later use UDTs/AOIs; RSLogix 500 uses
              data files and symbols. Keep behavior equivalent, but do not try to keep two live masters synchronized.
            </ChapterHead>

            <div className="card routine-card">
              <div className="card-hd"><h3>Recommended scan order</h3><span className="hd-note">MainProgram calls top to bottom</span></div>
              <div className="card-bd"><Table compact rows={PROGRAM_ROUTINES} columns={[
                { key: 'order', label: '#', mono: true }, { key: 'routine', label: 'Routine', mono: true }, { key: 'purpose', label: 'Responsibility' }, { key: 'output', label: 'Review result' }
              ]} /></div>
            </div>

            <div className="callout callout-info">
              <h4>Emulator workflow</h4>
              <div>
                Use the emulator supported by the installed Rockwell software and selected controller revision. Build with
                <span className="mono"> SYS_SimMode</span> on and hardware outputs inhibited; prove the internal state model;
                then turn simulation off and map the trainer. Logix Echo / Logix Emulate and RSLogix Emulate 500 support
                different controller families and revisions—confirm compatibility in the installed product documentation.
              </div>
            </div>

            <h3 className="notebook-subhead">Close permissive matrix</h3>
            <Table rows={PERMISSIVE_MATRIX} columns={[
              { key: 'device', label: 'Device', mono: true }, { key: 'closeRequires', label: 'Close requires' }, { key: 'tripOrBlock', label: 'Trip / block' }, { key: 'plcRole', label: 'PLC boundary' }
            ]} />

            <h3 className="notebook-subhead">Illustrative ladder patterns</h3>
            <div className="callout callout-warn" style={{ marginBottom: 10 }}>
              <h4>Placeholders, not paste-ready production rungs</h4>
              <div>Tags are invented; presets, current thresholds, voltage bands and travel times must come from reviewed project documents. Verify instruction behavior in the exact controller manual and use the normal project review/change process.</div>
            </div>
            <div className="logic-patterns">
              {LOGIC_PATTERNS.map((p, i) => <CodePattern key={p.title} pattern={p} index={i} />)}
            </div>

            <h3 className="notebook-subhead">Timers, counters & one-shots register</h3>
            <Table rows={TIMER_COUNTER_PLAN} columns={[
              { key: 'element', label: 'Element' }, { key: 'instance', label: 'Example instance', mono: true }, { key: 'trigger', label: 'Trigger' },
              { key: 'doneUse', label: 'Use' }, { key: 'reset', label: 'Reset' }, { key: 'warning', label: 'Design check' }
            ]} />

            <h3 className="notebook-subhead">Platform crosswalk</h3>
            <Table rows={PLATFORM_CROSSWALK} columns={[
              { key: 'concept', label: 'Concept' }, { key: 'studio', label: 'Studio 5000' }, { key: 'rslogix', label: 'RSLogix 500' }, { key: 'wonderware', label: 'Wonderware / AVEVA' }
            ]} />
          </section>

          <section className="notebook-chapter" id="kirk">
            <ChapterHead number="05" eyebrow="Four independent keys · mechanical authority" title="Kirk key system for capacitor banks">
              Model K1 through K4 as separate key exchanges around the four drawing-observed capacitor branches. The PLC may
              display electrical release preconditions; only the approved mechanical scheme and work procedure establish the real sequence.
            </ChapterHead>

            <div className="kirk-rule">
              <div className="kirk-key-icon">K1</div>
              <div><b>Language matters</b><p>Use <span className="mono">KEY RELEASE PERMITTED</span>, never “safe,” “de-energized,” or “safe to touch.” A CT low-current indication is not an absence-of-voltage test.</p></div>
            </div>

            <Table rows={KIRK_STATES} columns={[
              { key: 'state', label: 'State', mono: true }, { key: 'breaker', label: 'Breaker proof' }, { key: 'current', label: 'CT/current indication' },
              { key: 'key', label: 'Key location' }, { key: 'release', label: 'Release indication' }, { key: 'close', label: 'Close result' }
            ]} />

            <div className="kirk-sequence">
              {[
                ['1', 'OPEN', 'Open the selected bank breaker; trip/open always overrides close.'],
                ['2', 'PROVE', 'Require independent 52a/52b agreement, good input quality and no-current indication.'],
                ['3', 'WAIT', 'Run the bank-specific discharge timer using the approved manufacturer/engineering preset.'],
                ['4', 'RELEASE', 'Indicate release permitted; the mechanical lock controls actual key removal.'],
                ['5', 'ACCESS', 'Key-at-breaker drops and/or disconnect/access opens, so electrical close is blocked.'],
                ['6', 'RETURN', 'Secure access, restore disconnect as designed, return/trap key, cancel request and recalculate permissives.']
              ].map(([n, title, body]) => <div key={n}><span>{n}</span><b>{title}</b><p>{body}</p></div>)}
            </div>

            <div className="grid-2">
              <div className="callout callout-bad">
                <h4>Never derive personnel safety from the PLC</h4>
                <ul>
                  <li>No-current from an analog input can fail low.</li>
                  <li>An auxiliary contact does not prove isolation.</li>
                  <li>A timer does not prove capacitor discharge.</li>
                  <li>An HMI animation does not prove key position.</li>
                </ul>
              </div>
              <div className="callout callout-ok">
                <h4>What to test twice</h4>
                <ul>
                  <li>K1–K4 never share state, timers, counters or ONS storage.</li>
                  <li>Loss of any proof resets its discharge timer.</li>
                  <li>Power cycle cannot skip into RELEASE PERMITTED.</li>
                  <li>Key/access change blocks close immediately.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="notebook-chapter" id="hmi">
            <ChapterHead number="06" eyebrow="PLC owns decisions; HMI requests and explains" title="Wonderware / AVEVA HMI build">
              Product generations use different communication-server names. Record the installed InTouch/OI version and
              follow its matching manual instead of guessing a driver name from another release.
            </ChapterHead>

            <div className="hmi-screen-grid">
              {HMI_SCREENS.map((s) => <article key={s.screen}>
                <span>{s.screen}</span><h3>{s.includes}</h3><p><b>Action</b> {s.operatorAction}</p><small>{s.acceptance}</small>
              </article>)}
            </div>

            <div className="card">
              <div className="card-hd"><h3>Build the HMI in this order</h3><span className="hd-note">communications before graphics</span></div>
              <div className="card-bd numbered-steps">
                {WONDERWARE_STEPS.map((step, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></div>)}
              </div>
            </div>

            <div className="hmi-color-key">
              <div><span className="swatch closed" /><b>CLOSED</b><small>state + text</small></div>
              <div><span className="swatch open" /><b>OPEN</b><small>state + text</small></div>
              <div><span className="swatch moving" /><b>MOVING</b><small>timed transition</small></div>
              <div><span className="swatch bad" /><b>BAD STATUS</b><small>contradiction</small></div>
              <div><span className="swatch quality" /><b>BAD QUALITY</b><small>stale / comms</small></div>
            </div>
          </section>

          <section className="notebook-chapter" id="fat">
            <ChapterHead number="07" eyebrow="Prove failure, not only success" title="Factory acceptance & handoff">
              Record actual result, tester, date and evidence beside this matrix in the released project package. “Pass”
              means the expected result was observed in software emulation and again on the trainer where applicable.
            </ChapterHead>

            <Table rows={FAT_TESTS} columns={[
              { key: 'id', label: 'ID', mono: true }, { key: 'test', label: 'Test' }, { key: 'action', label: 'Method' }, { key: 'expected', label: 'Expected result' }
            ]} />

            <div className="handoff-grid">
              {[
                ['Controller', 'ACD or RSS source, upload/compare, firmware/catalog, module profiles'],
                ['HMI', 'Application backup, tag export, comms configuration, alarm export, user-role record'],
                ['Engineering', 'One-line, elementary diagrams, I/O map, permissive and cause/effect matrices'],
                ['Testing', 'FAT results, analog calibration, point-to-point sheets, force/bypass-zero record'],
                ['Restore', 'Clean-machine restore steps, required installers/licenses and known-good checksum/location'],
                ['Change control', 'Revision, approvers, open items, trainer-only boundary and next review date']
              ].map(([title, body]) => <div key={title}><span>□</span><b>{title}</b><p>{body}</p></div>)}
            </div>
          </section>

          <section className="notebook-chapter" id="sources">
            <ChapterHead number="08" eyebrow="Use the exact revision installed" title="Reference & document register">
              These links are starting points, not substitutes for the controller/module manuals, approved station drawings,
              relay settings, capacitor-bank manual, key-exchange diagram and site electrical safety procedure.
            </ChapterHead>

            <div className="reference-list">
              {REFERENCE_LINKS.map((r, i) => <a key={r.url} href={r.url} target="_blank" rel="noreferrer">
                <span>{String(i + 1).padStart(2, '0')}</span><div><b>{r.label} ↗</b><p>{r.use}</p></div>
              </a>)}
            </div>

            <div className="document-blanks">
              <h3>Project-specific documents to add</h3>
              {[
                'Approved substation one-line and revision', 'Breaker elementary/control schematics', 'Relay manual, settings file and cause/effect matrix',
                'Transformer protection schematic', 'Capacitor-bank nameplate/manual and discharge requirement', 'Kirk key exchange drawing and key schedule',
                'PLC/module installation and instruction manuals', 'Trainer wiring and electrical specifications', 'AVEVA/Wonderware application and OI-driver manuals',
                'Electrical safe-work, switching, LOTO and MOC procedures'
              ].map((x) => <div key={x}><span>□</span>{x}<i /></div>)}
            </div>

            <div className="notebook-signoff">
              <div><span>Prepared by</span><i /></div><div><span>Controls review</span><i /></div><div><span>Electrical / protection review</span><i /></div><div><span>Training release</span><i /></div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
