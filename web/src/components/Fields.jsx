import { Link } from 'react-router-dom';

// Keys that only repeat what the card title already says (the title is derived from them),
// plus the structural keys the rung renderer owns.
const SKIP = new Set([
  'id', 'status', 'sources', 'tags', 'section', 'kind', 'title', 'subtitle', 'body',
  'edited', 'created_at', 'updated_at', 'search', 'payload', '_state', '_unresolved', '_manual',
  'term', 'name', 'fullName', 'tag', 'letter', 'token', 'code', 'mnemonic', 'block', 'unit',
  'ladder', 'io',
  // secondary rungs: authored under arbitrary keys, picked up by subRungs() and drawn as diagrams
  'followOn', 'outputRung', 'proveRung', 'clearRung', 'resetRung', 'fuelRung', 'encodeRung',
  'swapRung', 'validRung', 'tripRung', 'overrideRung', 'blockRung', 'solenoidRung', 'timerRung'
]);

/** Render order + labels for the keys this reference authors. Unknown keys still render, after these. */
const ORDER = [
  ['oneLine', 'At a glance', 'text'],
  ['purpose', 'Purpose', 'text'],
  ['subtitle', 'Also known as', 'text'],
  ['variable', 'Measured variable', 'text'],
  ['principle', 'How it works', 'text'],
  ['function', 'Function', 'text'],
  ['definition', 'Definition', 'text'],
  ['behaviour', 'Behaviour', 'text'],
  ['meaning', 'Meaning', 'text'],
  ['note', 'Note', 'text'],
  ['fieldTruth', 'Field truth', 'text'],
  ['winterTruth', 'Field truth', 'text'],
  ['why', 'Why it matters', 'text'],
  ['whyItMatters', 'Why it matters', 'text'],
  ['rule', 'The rule', 'text'],
  ['key', 'Key idea', 'text'],
  ['how', 'How', 'text'],
  ['what', 'What the test does', 'text'],
  ['when', 'When', 'text'],
  ['formula', 'Formula', 'code'],
  ['basis', 'Basis', 'text'],
  ['example', 'Worked example', 'code'],
  ['example2', 'Example', 'code'],
  ['caution', 'Caution', 'text'],
  ['warning', 'Warning', 'warn'],
  ['expansion', 'Expansion', 'text'],
  ['drivenBy', 'Driven by', 'text'],
  ['airAction', 'Air / signal action', 'text'],
  ['failsafe', 'Fail-safe', 'text'],
  ['fail', 'Typical failures', 'list'],
  ['fails', 'Typical failures', 'list'],
  ['throttling', 'Throttling behaviour', 'text'],
  ['typical', 'Typical service', 'text'],
  ['use', 'Used for', 'text'],
  ['usage', 'Used for', 'text'],
  ['gotcha', 'Common defect', 'warn'],
  ['defects', 'Defects this pattern hides', 'list'],
  ['strengths', 'Strengths', 'list'],
  ['limits', 'Limitations', 'list'],
  ['countermeasures', 'Countermeasures', 'list'],
  ['variants', 'Variants', 'list'],
  ['readThisWay', 'How to read this rung', 'list'],
  ['sequence', 'Sequence', 'list'],
  ['procedure', 'Procedure', 'list'],
  ['warnings', 'Caveats', 'list'],
  ['consequence', 'Consequence', 'text'],
  ['scope', 'Scope', 'text'],
  ['usedFor', 'Used in this reference for', 'text'],
  ['name', 'Full name', 'text'],
  ['fullName', 'Full name', 'text'],
  ['category', 'Category', 'text'],
  ['group', 'Group', 'text'],
  ['family', 'Family', 'text'],
  ['level', 'Level', 'text'],
  ['loop', 'Loop', 'text'],
  ['type', 'Type', 'text'],
  ['symbol', 'Drawn as', 'code'],
  ['ascii', 'As text', 'code'],
  ['iec', 'IEC 61131-3', 'text'],
  ['siemens', 'Siemens name', 'text'],
  ['logix', 'Rockwell Logix name', 'text'],
  ['blocks', 'Blocks involved', 'text'],
  ['bits', 'Bit width', 'text'],
  ['range', 'Range', 'text'],
  ['default', 'Default value', 'text'],
  ['from', 'From', 'text'],
  ['to', 'To', 'text'],
  ['factor', 'Factor', 'text'],
  ['add', 'Offset added', 'text'],
  ['mul', 'Multiplier', 'text'],
  ['reference', 'Reference conditions', 'text'],
  ['stage', 'Stage', 'text'],
  ['permissive', 'Left to the user by ISA-5.1', 'warn'],
  ['cv', 'Controlled variable', 'text'],
  ['mv', 'Manipulated variable', 'text'],
  ['failure', 'Typical failure mode', 'warn'],
  ['needs', 'What it needs to work', 'list'],
  ['automation', 'In automation', 'list'],
  ['gasPlant', 'Why it matters in a gas plant', 'text'],
  ['where', 'Where it applies', 'text'],
  ['temp', 'Reference temperature', 'text'],
  ['press', 'Reference pressure', 'text'],
  ['method', 'Method', 'text'],
  ['test', 'Test', 'text'],
  ['howTo', 'How to do it', 'text'],
  ['boolean', 'As boolean logic', 'code'],
  ['mnemonics', 'Elements used', 'list'],
  ['order', 'Stage order', 'text'],
  ['members', 'Operands / members', 'pins'],
  ['pins', 'Pins', 'pins'],
  ['fields', 'Details', 'kv'],
  ['tableNotice', 'About these numbers', 'warn'],
  ['results', 'Resulting settings', 'table'],
  ['table', 'Reference table', 'table'],
  ['keyEquipment', 'Equipment in this stage', 'list'],
  ['controlFocus', 'What the control system manipulates', 'list'],
  ['tripConditions', 'Trip / excursion conditions', 'list'],
  ['layers', 'Layers', 'table'],
  ['network', 'Networks', 'text'],
  ['typicalPattern', 'A common pattern', 'table'],
  ['interactions', 'Interactions', 'list'],
  ['solventNotes', 'Solvent notes', 'list'],
  ['notes', 'Notes', 'text'],
  ['notesList', 'Notes', 'list'],
  ['implication', 'Implication', 'text'],
  ['how2', 'How', 'text'],
  ['exampleNotice', 'About this example', 'warn'],
  ['permissiveNote', 'Assigned by the user, not by the standard', 'warn'],
  ['plantNote', 'Plant note (edited locally)', 'warn']
];

const humanize = (k) => k
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (c) => c.toUpperCase())
  .replace(/_/g, ' ');

function isPlain(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function pinLabel(p) { return p.name ?? p.p ?? p.label ?? p.k ?? ''; }
function pinDesc(p) { return p.desc ?? p.d ?? p.value ?? p.v ?? ''; }

export function Value({ v }) {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return <span className="mono">{v ? 'true' : 'false'}</span>;
  if (typeof v === 'number') return <span className="mono tabular">{v}</span>;
  const str = String(v);
  if (/^[-\d.*+/()=<>%\s^]+$/.test(str) && /[=+\-*/%<>]/.test(str) && str.length < 130 && /\d|[=<>]/.test(str)) {
    return <div className="formula">{str}</div>;
  }
  return <span>{str}</span>;
}

export function Kv({ items }) {
  const rows = (items || []).filter((r) => r && (pinLabel(r) || pinDesc(r)));
  if (!rows.length) return null;
  return (
    <dl className="kv">
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{pinLabel(r)}</dt>
          <dd><Value v={pinDesc(r)} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ rows, caption }) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r || {})))].filter((k) => !SKIP.has(k));
  return (
    <div style={{ overflowX: 'auto' }}>
      {caption && <div className="small muted" style={{ marginBottom: 6 }}>{caption}</div>}
      <table className="tbl">
        <thead>
          <tr>{keys.map((k) => <th key={k} className={/^(Kc|Ti|Td|cv|factor|level|loop|controller)$/.test(k) ? 'mono' : ''}>{humanize(k)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k} className={/^(Kc|Ti|Td|cv|factor)$/.test(k) ? 'mono' : ''}>
                  {r?.[k] == null ? '' : typeof r[k] === 'object' ? JSON.stringify(r[k]) : String(r[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ label, type, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;

  if (type === 'code') {
    const txt = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
    if (!label) return <div className="formula">{txt}</div>;
    return (
      <div>
        <h4 style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', margin: '0 0 7px' }}>{label}</h4>
        <div className="formula">{txt}</div>
      </div>
    );
  }
  if (type === 'warn') {
    return (
      <div className="callout callout-warn">
        <h4>{label}</h4>
        {Array.isArray(value) ? <ul>{value.map((v, i) => <li key={i}>{typeof v === 'object' ? <Kv items={[v]} /> : String(v)}</li>)}</ul> : <div>{String(value)}</div>}
      </div>
    );
  }
  if (type === 'list') {
    const list = Array.isArray(value) ? value : [value];
    const items = list.map((v) => (typeof v === 'object' && v !== null ? v : String(v)));
    return (
      <div>
        <h4 style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', margin: '0 0 7px' }}>{label}</h4>
        <ul style={{ margin: 0, paddingLeft: 19 }}>{items.map((v, i) => (
          <li key={i}>{typeof v === 'string' ? <Value v={v} /> : <Kv items={[v]} />}</li>
        ))}</ul>
      </div>
    );
  }
  if (type === 'kv') return (<div><h4 style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', margin: '0 0 7px' }}>{label}</h4><Kv items={Array.isArray(value) ? value : Object.entries(value).map(([k, v]) => ({ label: k, value: v }))} /></div>);
  if (type === 'pins') return (<div><h4 style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', margin: '0 0 7px' }}>{label}</h4><Kv items={value} /></div>);
  if (type === 'table') return <Table rows={value} caption={label === humanize(label) ? undefined : label} />;
  const text = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
  return (
    <div>
      <h4 style={{ color: 'var(--ink-3)', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase', margin: '0 0 7px' }}>{label}</h4>
      <div className="prose" style={{ marginTop: 0 }}>{text.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
    </div>
  );
}

/** Renders every authored field of an entry payload, in a deliberate order, without hiding extras. */
export function Fields({ entry }) {
  const p = entry?.payload || {};
  const rendered = new Set([...ORDER.map(([k]) => k), ...SKIP]);
  const blocks = [];

  const headlines = new Set([entry.title, entry.subtitle, entry.body].filter(Boolean).map((x) => String(x).trim()));
  for (const [key, label, type] of ORDER) {
    if (p[key] == null || p[key] === '' || p[key] === false) continue;
    if (typeof p[key] === 'string' && headlines.has(p[key].trim())) continue;
    if (key === 'permissive' && p[key] === true) {
      blocks.push({ key, label: 'This letter is not assigned by ISA-5.1', type: 'warn',
        value: 'ISA-5.1 leaves this letter to the user. This reference will not invent a meaning for it - read the plant tag register or the P&ID legend, and treat any other source as a guess.' });
      continue;
    }
    blocks.push({ key, label, type, value: p[key] });
  }
  for (const [key, value] of Object.entries(p)) {
    if (rendered.has(key) || value == null || value === '') continue;
    if (typeof value === 'string' && headlines.has(value.trim())) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (value === false) continue; // an absent flag is not information
    if (isPlain(value) && Object.keys(value).some((k) => k.length > 22)) continue;
    const type = Array.isArray(value)
      ? (value.every((v) => typeof v === 'string') ? 'list' : (value.every((v) => isPlain(v)) ? 'table' : 'list'))
      : (isPlain(value) ? 'kv' : 'text');
    blocks.push({ key, label: humanize(key), type, value });
  }

  if (!blocks.length) return null;
  return (
    <div className="stack" style={{ gap: 14 }}>
      {blocks.map(({ key, ...rest }) => <Block key={key} {...rest} />)}
    </div>
  );
}

/** Cross-links to related entries by title text; keeps navigation inside the reference. */
export function RelatedLinks({ ids = [], sectionSlug, all = [] }) {
  if (!all.length) return null;
  const wanted = new Set(ids.map((s) => String(s).toLowerCase()));
  const hits = all.filter((e) => wanted.has(e.id.toLowerCase()) || wanted.has(String(e.title).toLowerCase()));
  if (!hits.length) return null;
  return (
    <div className="row">
      {hits.map((h) => <Link key={h.id} className="pill" to={`/e/${encodeURIComponent(h.id)}`}>{h.title}</Link>)}
    </div>
  );
}

export const ORDER_KEYS = ORDER.map(([k]) => k);
export const SKIP_KEYS = [...SKIP];
