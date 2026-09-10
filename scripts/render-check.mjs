#!/usr/bin/env node
/**
 * Render every seeded entry through the real React components.
 *
 *   npm run check:render          (expects the API on http://127.0.0.1:8787)
 *   API_ORIGIN=http://host:port npm run check:render
 *
 * Why this exists: the reference data is authored as plain objects, and the UI renders whatever
 * keys it finds. A new field with an unexpected shape (a string where the renderer expects a list,
 * a ladder rung with an element missing from its I/O table) then only shows up as a white screen on
 * a phone in a plant. This bundles the components with esbuild, renders all ~700 entries plus every
 * rung diagram and simulator into a string, and fails if anything throws.
 */
let build;
try {
  ({ build } = await import('esbuild'));
} catch {
  console.error('esbuild is not resolvable from the repo root. It ships with vite; run `npm install` at the repository root.');
  process.exit(2);
}
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'logical-render-check-'));
const outfile = join(dir, 'bundle.cjs');

try {
  await build({
    entryPoints: [join(root, 'tests/render-check.entry.jsx')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    jsx: 'automatic',
    loader: { '.jsx': 'jsx', '.js': 'jsx' },
    define: { 'import.meta.env.DEV': 'false' },
    logLevel: 'warning'
  });
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', outfile], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
