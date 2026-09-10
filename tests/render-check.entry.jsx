import { renderToString } from 'react-dom/server';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EntryCard, StatusLegend } from '../web/src/components/Bits.jsx';
import { Fields, RelatedLinks, ORDER_KEYS } from '../web/src/components/Fields.jsx';
import { RungStatic, RungSimulator, subRungs, describeRung } from '../web/src/components/RungDiagram.jsx';

const BASE = process.env.API_ORIGIN || 'http://127.0.0.1:8787';
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
async function main() {
  const j = async (p) => (await fetch(BASE + p)).json();
  let sections;
  try {
    sections = (await j('/api/sections')).sections;
  } catch (e) {
    console.error(`cannot read ${BASE}/api/sections - start the API first (npm run dev, or npm start after a build). ${e.message}`);
    process.exit(2);
  }
  if (!sections?.length) { console.error('the API returned no sections - run npm run seed:reset'); process.exit(2); }

let rendered = 0, crashes = [], rungCount = 0, simCount = 0;
const leftovers = new Map();
const SKIP = new Set(['ladder', 'io', 'id', 'status', 'sources', 'tags', 'section', 'kind', 'title', 'subtitle', 'body', 'edited', 'created_at', 'updated_at', 'search', 'payload']);
const ORDER = new Set(ORDER_KEYS);

for (const s of sections) {
  const { entries } = await j(`/api/entries?section=${s.slug}&limit=500`);
  for (const card of entries) {
    const full = await j(`/api/entries/${encodeURIComponent(card.id)}`);
    const e = full.entry;
    try {
      renderToString(React.createElement(MemoryRouter, null, React.createElement(EntryCard, { entry: e })));
      renderToString(React.createElement(Fields, { entry: e }));
      rendered++;
      for (const k of Object.keys(e.payload || {})) {
        if (SKIP.has(k)) continue;
        if (!ORDER.has(k)) leftovers.set(k, (leftovers.get(k) || 0) + 1);
      }
      if (e.payload?.ladder) {
        rungCount++;
        renderToString(React.createElement(RungStatic, { ladder: e.payload.ladder }));
        renderToString(React.createElement(RungSimulator, { entry: e }));
        simCount++;
        const text = describeRung(e.payload.ladder);
        if (!text || text.length < 5) crashes.push(`${e.id}: empty rung description`);
        for (const sr of subRungs(e.payload)) if (!sr.ladder) crashes.push(`${e.id}: sub-rung ${sr.key} has no ladder`);
      }
      renderToString(React.createElement(RelatedLinks, { ids: Object.keys(e.payload || {}), all: [e] }));
    } catch (err) {
      crashes.push(`${e.id}: ${err.message}`);
    }
  }
}
renderToString(React.createElement(StatusLegend));

console.log(`rendered ${rendered} entries (${rungCount} rungs, ${simCount} simulators) with ${crashes.length} failures`);
if (crashes.length) console.log(crashes.slice(0, 20).join('\n'));
const sorted = [...leftovers.entries()].sort((a, b) => b[1] - a[1]);
console.log(`\nkeys not in the render order (auto-rendered with a humanized label): ${sorted.length} distinct`);
console.log(sorted.slice(0, 45).map(([k, n]) => `${k}×${n}`).join(', '));
process.exit(crashes.length ? 1 : 0);
}
