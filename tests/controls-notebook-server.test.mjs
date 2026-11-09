import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROLS_NOTEBOOK } from '../web/src/data/controlsNotebook.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const builtPdf = join(root, 'web/dist/documents/controls-notebook-v1.2.pdf');

async function freePort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer(port, dataDir) {
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/src/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production', LOGICAL_DATA_DIR: dataDir, LOGICAL_DB: '', ADMIN_TOKEN: 'integration-test-only' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 15000);
      child.stdout.on('data', (chunk) => {
        log += chunk;
        if (log.includes('Logical API')) { clearTimeout(timeout); resolve(); }
      });
      child.stderr.on('data', (chunk) => { log += chunk; });
      child.once('error', (error) => { clearTimeout(timeout); reject(error); });
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited (${code}): ${log}`)); });
    });
    return child;
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

test('production serves the PDF correctly and a restart preserves existing saved data', {
  skip: !existsSync(builtPdf) && 'Build the web app first to exercise production assets.',
  timeout: 30000
}, async () => {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), 'logical-notebook-test-'));
  const base = `http://127.0.0.1:${port}`;
  let server;
  try {
    server = await startServer(port, dataDir);
    const pdfUrl = base + CONTROLS_NOTEBOOK.pdfUrl;
    const head = await fetch(pdfUrl, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.match(head.headers.get('content-type'), /^application\/pdf/);
    assert.equal(head.headers.get('accept-ranges'), 'bytes');
    assert.equal(Number(head.headers.get('content-length')), readFileSync(builtPdf).length);

    const range = await fetch(pdfUrl, { headers: { range: 'bytes=0-4' } });
    assert.equal(range.status, 206);
    assert.match(range.headers.get('content-range'), /^bytes 0-4\//);
    assert.equal(await range.text(), '%PDF-');
    const original = Buffer.from(await (await fetch(pdfUrl)).arrayBuffer());
    assert.equal(createHash('sha256').update(original).digest('hex'), CONTROLS_NOTEBOOK.sha256);

    const indexResponse = await fetch(base + CONTROLS_NOTEBOOK.indexUrl);
    assert.equal(indexResponse.status, 200);
    assert.match(indexResponse.headers.get('content-type'), /^application\/json/);
    assert.equal((await indexResponse.json()).pageCount, 108);
    assert.equal((await fetch(base + '/documents/does-not-exist.pdf')).status, 404);
    assert.match((await fetch(base + '/controls-notebook?page=73')).headers.get('content-type'), /^text\/html/);

    const entry = (await (await fetch(base + '/api/entries?limit=1')).json()).entries[0];
    assert.ok(entry?.id);
    const encodedId = encodeURIComponent(entry.id);
    assert.equal((await fetch(`${base}/api/bookmarks/${encodedId}`, { method: 'PUT' })).status, 200);
    const note = 'Notebook deployment regression check';
    assert.equal((await fetch(`${base}/api/notes/${encodedId}`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: note })
    })).status, 200);

    await stopServer(server);
    server = await startServer(port, dataDir);
    assert.ok((await (await fetch(base + '/api/bookmarks')).json()).ids.includes(entry.id));
    assert.equal((await (await fetch(`${base}/api/notes/${encodedId}`)).json()).body, note);
  } finally {
    await stopServer(server);
    rmSync(dataDir, { recursive: true, force: true });
  }
});
