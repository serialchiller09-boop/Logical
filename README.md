# Logical

A pocket reference and working tool for **reading and writing ladder logic around gas plant equipment** —
ISA-5.1 tags, valves and actuators, transmitters and analysers, IEC 61131-3 data types, ladder elements,
function blocks, PID/loop structure, gas process stages, equipment, safety and interlock vocabulary, units,
and a standards index. Plus a rung simulator you can actually step, bookmarks, notes, and an editor for
plant-specific answers.

734 entries across 14 sections. Everything is one codebase: an Express + SQLite API whose content is
version-controlled data modules, and a React front end that renders them.

```bash
npm install
npm run seed        # build server/data/logical.db from server/src/seed/**
npm run dev         # API on :8787, Vite on :5173 (proxies /api)
# or, for a single-process install:
npm run build && npm start     # Express serves web/dist and the API on :8787
```

Requires **Node ≥ 22.12** (the database is `node:sqlite`, built into Node — no native build step).

## The one rule that shapes everything

**No invented facts, and no invented numbers.** The reference part of this app is safe to read at 2 a.m.
because of two disciplines:

1. **Every entry carries a provenance badge** and a pointer to the document it was read from. `standard-defined`
   means a named standard or vendor manual; `practice` means documented habit, not codified; `vendor` means the
   name and scope depend on your platform and revision; `site-specific` means your documents decide;
   `unverified` means a lead, not a fact; `authored example` means written here to teach a pattern. Nothing is a
   paraphrase of a paywalled standard — entries cite the document, they do not reproduce it.
2. **Setpoints, alarm and trip limits, relief settings and process conditions are deliberately absent.** The only
   arithmetic here is definitional: `4–20 mA` maps linearly to `%` of span, `psia = psig + atmospheric`,
   `Kc = 100 / PB%`, `MMBtu/d = Mcf/d × Btu/scf ÷ 1000`, IEC bit widths and ranges. Worked examples carry
   invented tags and placeholders that are labelled as such; published tuning rules are shown as classroom
   relations with a "not design values" warning. Where ISA-5.1 assigns a letter to *"user's choice"*, the tag
   decoder refuses to pick a meaning for it and reports the ambiguity instead.

Two consequences of that rule are enforced in code rather than in prose, so they survive the next
content edit (`tests/content.test.mjs`): the normalizer stamps every example rung with a notice that its
tags are invented and its presets are placeholders, and every tuning table with a warning that the published
relations are not design values; and an entry may only carry the `standard-defined` badge when a document is
actually named for that row - a row whose only pointer is a section-basis note (most acronym expansions, which
are field usage rather than codified) is downgraded to `practice` automatically. The tag decoder likewise
refuses to name a meaning for a letter the standard leaves to the user, and reports the ambiguity instead.

The tools say the same thing about themselves: the simulator is a simplified virtual-tick scan model, and the
calculators only do arithmetic that is true by definition. If a number matters, it comes from your P&ID legend,
tag register, I/O list, cause-and-effect matrix, safety requirements specification, alarm philosophy and vendor
manuals — not from this app.

## What's in it

| Section | Entries | What it's for |
|---|---|---|
| Acronyms | 219 | Gas plant and automation abbreviations, grouped, with what each one means on a P&ID or in a spec |
| Valves & actuators | 79 | Body types, actuators, fail action, solenoids and relays, accessories, leakage and fire-test vocabulary |
| Transmitters & analysers | 48 | dP/radar/ultrasonic/displacer level, flow, pressure, temperature, GC, moisture, H₂S, and signal types |
| ISA-5.1 letters | 57 | First letters, succeeding letters, modifier/limit letters — including the ones the standard leaves to you |
| Ladder elements | 48 | XIC/XIO, OTE/OTL/OTU, ONS, TON/TOF/RTO, CTU/CTD, RES, comparators, MOV/CPT/SEL/LIM, JSR/LBL, MCR, plus scan-order concepts |
| Example rungs | 16 | Seal-in, latch/acknowledge, 2oo3, deadband alarm, restart lockout, run-on, stroke counting, proven position, first-out, purge sequence, PID with override, anti-surge, F&G-to-ESD, lead/lag, scaling, step sequencer — all diagrammed and runnable |
| Function blocks | 37 | The IEC block set plus what each pin means, grouped by family |
| Data types | 33 | IEC 61131-3 elementary and derived types, sizes, ranges, defaults, literal syntax, cross-vendor names |
| PID & loops | 48 | Terms, structures (cascade, ratio, split-range, feedforward), tuning relations with their caveats, typical gas plant loop characters |
| Gas process stages | 14 | Inlet/separation → compression → sweetening → acid gas → dehydration → NGL → cryogenic/turboexpander → treating → sales metering → flare/relief → utilities |
| Equipment | 36 | Separators, compressors, expanders, towers, reboilers, dryers, engines/turbines, flare headers, knockout drums |
| Safety & interlocks | 22 | Fail-safe philosophy, SIL/SIF vocabulary, bypass and override discipline, ESD levels, proof testing, first-out, MOC |
| Units & formulas | 39 | Definitional conversions and relations, with reference conditions called out |
| Standards index | 38 | What each named document actually governs and why it appears here (scope, never content) |

## Layout

```
server/
  src/index.js               Express app: API + static hosting of web/dist + SPA fallback
  src/db.js                  node:sqlite (WAL), schema, hydrate, seed()
  src/routes/reference.js    sections / entries / search / entry / tag / stats  (read-only)
  src/routes/userState.js    bookmarks, notes, recents  +  admin CRUD (token-guarded)
  src/lib/tagDecode.js       ISA-5.1 tag parser + letter resolver (no guessing)
  src/seed/sections.js       14 sections in 4 groups
  src/seed/index.js          normalizer: authored records -> flat, searchable entries
  src/seed/data/*.js         THE CONTENT. Plain JS modules, reviewed in git like code
  src/seed/sources.js        section/kind provenance pointers for entries with no citation of their own
  src/seed/run.js            seeding CLI (--force, --reset)
web/
  src/lib/ladder.js          rung analysis + geometry + scan model (pure, testable, no React)
  src/lib/api.js, store.jsx  fetch layer, app state, toasts, ⌘K
  src/components/            RungDiagram + RungSimulator, Fields (renders any payload), TagDecoder,
                             Calculators, SearchPalette, status/badge/provenance bits
  src/pages/                 Home, Browse (section + search), Entry, Tools, Saved, Admin
  src/styles.css             the whole design system, plus a print stylesheet
tests/ladder.test.mjs        engine + rung-data semantics (node --test)
tests/render-check.entry.jsx renders every entry through every component (needs the API up)
docs/ADMIN.md                the admin token, what an edit does, how reseeding protects your data
```

## Commands

| | |
|---|---|
| `npm run dev` | API (`--watch`) + Vite dev server, `concurrently` |
| `npm run build` | production bundle into `web/dist` |
| `npm start` | Express serves the API *and* `web/dist` from one port (`PORT`, default 8787) |
| `npm run seed` | create `server/data/logical.db` from the data modules (no-op if already seeded) |
| `npm run seed:force` | re-apply reference content from source; rows you edited or created are kept |
| `npm run seed:reset` | delete the database and rebuild it (this does clear bookmarks/notes — export first) |
| `npm test` | 33 tests: ladder semantics, geometry integrity, I/O completeness, and the content policy below (provenance, badges, disclaimers) |
| `npm run verify` | production build plus the test suite; useful as a hosting build check |
| `npm run check:render` | render all 734 entries (cards, detail bodies, rung diagrams and simulators) into strings and fail on any throw - needs the API up; uses the esbuild that ships with vite |

Environment: `PORT`, `HOST`, `LOGICAL_DB`, `LOGICAL_DATA_DIR`, `ADMIN_TOKEN` (see `docs/ADMIN.md`), and
`API_ORIGIN` for the Vite proxy when the API lives elsewhere.

## Deployment

Logical is deployed as one Node web service: run `npm run build`, then `npm start`. Express serves both the
API and the built React app from the same port. It is **not** a GitHub Pages-only app unless you convert it to
a static/read-only build.

Production needs Node `>=22.12.0`, a private `ADMIN_TOKEN`, and a persistent disk for `LOGICAL_DATA_DIR` if you
want bookmarks, notes, and Plant data edits to survive redeploys. This repo includes ready-to-use deployment
files for Render (`render.yaml`), Railway/Nixpacks (`railway.json`, `nixpacks.toml`), and Docker/Fly.io
(`Dockerfile`, `fly.toml`). See [`docs/DEPLOY.md`](docs/DEPLOY.md) for step-by-step hosting instructions.

## API

Read side (public, no auth): `GET /api/health`, `/api/sections`, `/api/entries?section&kind&status&q&limit&offset`,
`/api/search?q=` (ranked, grouped, with snippets), `/api/entries/:id` (entry + section + prev/next + your note),
`/api/tag?tag=PSHH-101`, `/api/stats`.

Your own state, stored per install: `GET /api/state`, `PUT|DELETE /api/bookmarks/:id`, `PUT /api/notes/:id`
(empty body clears), `POST /api/recents/:id`, `DELETE /api/recents`.

Plant data (guarded by the `x-admin-token` header, see `docs/ADMIN.md`): `GET /api/admin/entries`,
`PUT /api/admin/entries/:id`, `POST /api/admin/entries`, `DELETE /api/admin/entries/:id`,
`GET /api/admin/diff/:id`, `POST /api/admin/revert/:id`, `POST /api/admin/reseed`, `GET /api/admin/export`.

Entry shape (the `entries` table): `id, section, kind, title, subtitle, body, status, tags[], sources[],
payload, search, edited`. `payload` keeps the whole authored record, and `Fields` renders any key it does not
already know about — so adding a field to a data module shows up in the UI without touching the components.
Search is `LIKE` plus ranking over the flattened `search` blob (no FTS5), which is plenty at this size and
keeps the schema dependency-free.

## The simulator

Rung examples are data: `{ ladder, io, readThisWay, defects, … }`. One object drives the SVG diagram, the
"read as text" line and the scan model. `analyze(rung, state, { live })` walks the rung the way a runtime
evaluates it — left to right, power accumulating through a series chain, each parallel branch fed by the power
at the branch point — with `live: false` used for drawing (pure) and `live: true` for a scan (timers, counters,
edge bits and output writes). Force the inputs, step the scan, watch `.ACC`/`.DN` and the seal-in.

Modelled: boolean conduction, TON/TOF/RTO accumulation by scan period, CTU/CTD with rising-edge detection,
ONS, RES, comparators with tag or arithmetic operands, MOV/CPT/SEL/LIM/PID, timer/counter member references
(`T_LOCK.DN`, `C5:0/DN`). Not modelled, and the UI says so: I/O update points, task priorities and scan
overlap, comm faults, retentive behaviour on your specific platform, and any instruction quirk in a firmware
revision. It is a teaching model, not a runtime.

Comparators that cannot resolve an operand fall back to a manual toggle and are drawn with a warning ring, so
the app never pretends a rung is doing something it could not read.

## Extending the content

1. Add or edit records in `server/src/seed/data/<file>.js`. Use existing fields where they fit; new fields are
   picked up by the detail renderer automatically. Give each entry a `status`, and add `sources` when the claim
   is narrow (otherwise it inherits the section's pointers).
2. `npm run seed:force && npm test && npm run check:render`.
3. If you added a rung: keep the I/O table complete (every tag used must have a row), keep tags invented, label
   every preset as a placeholder, and describe what the pattern hides. The tests enforce these.

Anything you decide for your own plant should go through the **Plant data** screen rather than the seed files:
it is flagged `edited from reference`, diffable against source, visible as a deviation to everyone else using
the install, and it survives a reseed. Notes and bookmarks are personal state and are never part of the content.

## Not a safety authority

This is a reference and a working tool. It is not an engineered system of record, not a substitute for your
plant documentation, and not a route for approving logic changes — a protection function or a setpoint change
belongs in management of change with the responsible discipline. If this app and your documents disagree, your
documents win, and the entry should be flagged for correction.
