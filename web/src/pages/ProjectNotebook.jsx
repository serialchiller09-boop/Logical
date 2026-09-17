import { useCallback, useMemo, useState } from 'react';
import { useApp, useTitle } from '../lib/store.jsx';
import {
  ALL_IO_ROWS,
  ASSUMED_TOPOLOGY,
  BUILD_PHASES,
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
  controller: 'Choose exact controller catalog and firmware',
  toolchain: 'Studio 5000 or RSLogix 500 — choose the active target',
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
    <div className="oneline-wrap" role="img" aria-label="Assumed training one-line: source through main breaker to bus, transformer feeder and two capacitor banks">
      <svg className="oneline" viewBox="0 0 980 410">
        <title>Assumed training one-line — replace with the supplied approved drawing</title>
        <desc>Training source SRC-101 feeds CB-101 and BUS-101. The bus feeds CB-201 and transformer T-101, plus independent capacitor-bank breakers CB-301 and CB-302.</desc>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="ol-wire">
          <line x1="80" y1="58" x2="80" y2="108" />
          <line x1="80" y1="148" x2="80" y2="205" />
          <line x1="80" y1="205" x2="900" y2="205" className="ol-bus" />
          <line x1="340" y1="205" x2="340" y2="263" />
          <line x1="340" y1="303" x2="340" y2="326" />
          <line x1="625" y1="205" x2="625" y2="263" />
          <line x1="625" y1="303" x2="625" y2="354" />
          <line x1="820" y1="205" x2="820" y2="263" />
          <line x1="820" y1="303" x2="820" y2="354" />
        </g>
        <g className="ol-source">
          <circle cx="80" cy="42" r="16" />
          <path d="M68 42c5-9 9 9 14 0s9 9 14 0" />
          <text x="110" y="39">SRC-101</text><text x="110" y="56" className="ol-sub">SIMULATED SOURCE</text>
        </g>
        <g className="ol-breaker" transform="translate(80 128)">
          <rect x="-25" y="-20" width="50" height="40" rx="5" />
          <line x1="-13" y1="10" x2="13" y2="-10" />
          <text x="42" y="-3">CB-101</text><text x="42" y="14" className="ol-sub">MAIN · 52a/52b</text>
        </g>
        <text x="94" y="190" className="ol-ct">CT</text>
        <text x="80" y="190" className="ol-ct-ring">◯</text>
        <text x="80" y="230" textAnchor="middle">BUS-101</text>

        <g className="ol-breaker" transform="translate(340 283)">
          <rect x="-25" y="-20" width="50" height="40" rx="5" />
          <line x1="-13" y1="10" x2="13" y2="-10" />
          <text x="42" y="-3">CB-201</text><text x="42" y="14" className="ol-sub">XFMR FEEDER</text>
        </g>
        <g className="ol-xfmr" transform="translate(340 349)">
          <circle cx="0" cy="-10" r="20" /><circle cx="0" cy="12" r="20" />
          <text x="42" y="-4">T-101</text><text x="42" y="13" className="ol-sub">PROTECTION MONITORED</text>
        </g>

        <g className="ol-breaker" transform="translate(625 283)">
          <rect x="-25" y="-20" width="50" height="40" rx="5" />
          <line x1="-13" y1="10" x2="13" y2="-10" />
          <text x="42" y="-3">CB-301</text><text x="42" y="14" className="ol-sub">K1 KEY</text>
        </g>
        <g className="ol-cap" transform="translate(625 367)">
          <line x1="-18" y1="-11" x2="18" y2="-11" /><line x1="-18" y1="3" x2="18" y2="3" /><line x1="0" y1="3" x2="0" y2="20" />
          <text x="42" y="0">CAP-1</text><text x="42" y="17" className="ol-sub">DISCHARGE + ACCESS</text>
        </g>

        <g className="ol-breaker" transform="translate(820 283)">
          <rect x="-25" y="-20" width="50" height="40" rx="5" />
          <line x1="-13" y1="10" x2="13" y2="-10" />
          <text x="42" y="-3">CB-302</text><text x="42" y="14" className="ol-sub">K2 KEY</text>
        </g>
        <g className="ol-cap" transform="translate(820 367)">
          <line x1="-18" y1="-11" x2="18" y2="-11" /><line x1="-18" y1="3" x2="18" y2="3" /><line x1="0" y1="3" x2="0" y2="20" />
          <text x="42" y="0">CAP-2</text><text x="42" y="17" className="ol-sub">INDEPENDENT K2</text>
        </g>
        <g className="ol-relay" transform="translate(735 84)">
          <rect x="-70" y="-28" width="140" height="56" rx="8" />
          <text textAnchor="middle" y="-3">50/51 · 27/59 · 86</text><text textAnchor="middle" y="15" className="ol-sub">RELAY TRIPS WIN</text>
          <path d="M0 28V86" strokeDasharray="5 5" />
        </g>
        <text x="900" y="195" textAnchor="end" className="ol-note">TRAINING MODEL · NO LIVE BUS</text>
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
          organized around breakers, transformer and relay supervision, CT/VT simulation, two Kirk-keyed capacitor
          banks, permissives, timers, counters and one-shots.
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
            <ChapterHead number="01" eyebrow="Start with documents, not rungs" title="Design basis">
              The substation drawing was not included in the repository, so the topology below is an explicit, editable
              assumption—not a claim about the real station. Replace it before using anything beyond emulation.
            </ChapterHead>

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

            <div className="card oneline-card">
              <div className="card-hd"><h3>Assumed training one-line</h3><span className="st st-site-specific">replace from drawing</span></div>
              <div className="card-bd"><OneLineDiagram /></div>
            </div>

            <div className="card">
              <div className="card-hd"><h3>Device register</h3><span className="hd-note">the model boundary</span></div>
              <div className="card-bd">
                <Table compact rows={ASSUMED_TOPOLOGY} columns={[
                  { key: 'tag', label: 'Assumed tag', mono: true }, { key: 'device', label: 'Device' }, { key: 'role', label: 'Modeled role' }
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
            <ChapterHead number="03" eyebrow="Thirty-two inputs, eight outputs" title="Physical trainer I/O map">
              The addresses are rack examples, not guarantees. Match the actual modules, terminal bases and processor
              addressing. Leave the sixteenth channel in each digital input group spare.
            </ChapterHead>

            <div className="io-allocation">
              {[
                ['Slot 1', '15 × maintained DI', '1 spare'], ['Slot 2', '15 × momentary DI', '1 spare'],
                ['Slot 3', '2 × isolated AI', 'calibrate'], ['Slot 4', '6 green + 2 amber DO', '8 used']
              ].map(([slot, use, meta]) => <div key={slot}><span>{slot}</span><b>{use}</b><small>{meta}</small></div>)}
            </div>

            <div className="callout callout-warn">
              <h4>Before wiring</h4>
              <div>Verify input/output voltage, commons, source/sink type, analog signal mode, isolation, fusing and LED current against the exact PLC and trainer manuals. “Potentiometer” does not by itself identify a safe signal for an analog module.</div>
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
            <ChapterHead number="05" eyebrow="Mechanical authority, PLC supervision" title="Kirk key system for capacitor banks">
              Model two independent key exchanges. The PLC may display that electrical preconditions for a release are met;
              only the approved mechanical interlock scheme and work procedure establish the real sequence.
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
                  <li>K1 state never releases or blocks K2 by accident.</li>
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
