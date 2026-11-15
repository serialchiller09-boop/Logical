/**
 * Security surface tests for PR A: session-scoped personal state, CORS allowlist,
 * production ADMIN_TOKEN guard, lean /api/health, production 500 body, and audit pins.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(root, 'package.json'));

async function freePort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close((error) => (error ? reject(error) : resolve())));
  return port;
}

async function startServer(env = {}) {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), 'logical-security-'));
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/src/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      LOGICAL_DATA_DIR: dataDir,
      LOGICAL_DB: '',
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 20000);
      child.stdout.on('data', (chunk) => {
        log += chunk;
        if (log.includes('Logical API')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.stderr.on('data', (chunk) => {
        log += chunk;
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Server exited (${code}): ${log}`));
      });
    });
    return { child, port, dataDir, base: `http://127.0.0.1:${port}`, log };
  } catch (error) {
    child.kill('SIGTERM');
    rmSync(dataDir, { recursive: true, force: true });
    throw error;
  }
}

async function stopServer(handle) {
  if (!handle) return;
  const { child, dataDir } = handle;
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}

/** Tiny cookie jar so Node fetch keeps logical_sid across requests. */
function jar() {
  let cookie = '';
  return {
    async fetch(url, opts = {}) {
      const headers = { ...(opts.headers || {}) };
      if (cookie) headers.cookie = cookie;
      const res = await fetch(url, { ...opts, headers });
      const setCookies = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
      for (const raw of setCookies) {
        const pair = String(raw).split(';')[0];
        if (pair.toLowerCase().startsWith('logical_sid=')) cookie = pair;
      }
      return res;
    },
    get cookie() {
      return cookie;
    }
  };
}

describe('1. personal state scoped by anonymous session cookie', () => {
  test('two browsers do not share bookmarks or notes; cookie is httpOnly', async () => {
    const handle = await startServer({ NODE_ENV: 'production', ADMIN_TOKEN: 'integration-test-only' });
    try {
      const a = jar();
      const b = jar();
      const entry = (await (await fetch(`${handle.base}/api/entries?limit=1`)).json()).entries[0];
      assert.ok(entry?.id);
      const id = encodeURIComponent(entry.id);

      const put = await a.fetch(`${handle.base}/api/bookmarks/${id}`, { method: 'PUT' });
      assert.equal(put.status, 200);
      assert.match(a.cookie, /^logical_sid=[a-f0-9]{64}$/i);
      const setCookie = put.headers.getSetCookie?.()?.[0] || put.headers.get('set-cookie') || '';
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Lax/i);

      assert.equal((await a.fetch(`${handle.base}/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'session-a-note' })
      })).status, 200);

      const aBookmarks = await (await a.fetch(`${handle.base}/api/bookmarks`)).json();
      assert.ok(aBookmarks.ids.includes(entry.id));

      const bBookmarks = await (await b.fetch(`${handle.base}/api/bookmarks`)).json();
      assert.equal(bBookmarks.ids.includes(entry.id), false);
      assert.notEqual(a.cookie, b.cookie);

      const bNote = await (await b.fetch(`${handle.base}/api/notes/${id}`)).json();
      assert.equal(bNote.body, '');
      const aNote = await (await a.fetch(`${handle.base}/api/notes/${id}`)).json();
      assert.equal(aNote.body, 'session-a-note');
    } finally {
      await stopServer(handle);
    }
  });
});

describe('2. CORS same-origin / allowlist', () => {
  test('foreign Origin gets no ACAO; allowlisted Origin does', async () => {
    const handle = await startServer({
      NODE_ENV: 'production',
      ADMIN_TOKEN: 'integration-test-only',
      CORS_ORIGINS: 'https://allowed.example'
    });
    try {
      const denied = await fetch(`${handle.base}/api/health`, {
        headers: { Origin: 'https://evil.example' }
      });
      assert.equal(denied.status, 200);
      assert.equal(denied.headers.get('access-control-allow-origin'), null);

      const allowed = await fetch(`${handle.base}/api/health`, {
        headers: { Origin: 'https://allowed.example' }
      });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example');
      assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
    } finally {
      await stopServer(handle);
    }
  });
});

describe('3. ADMIN_TOKEN production guard', () => {
  test('production without ADMIN_TOKEN disables admin (503); with token works', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'logical-admin-'));
    const port = await freePort();
    const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production', LOGICAL_DATA_DIR: dataDir, LOGICAL_DB: '' };
    delete env.ADMIN_TOKEN;
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/src/index.js'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let log = '';
    const handle = { child, dataDir, base: `http://127.0.0.1:${port}` };
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`startup: ${log}`)), 20000);
        child.stdout.on('data', (chunk) => {
          log += chunk;
          if (log.includes('Logical API')) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.stderr.on('data', (chunk) => {
          log += chunk;
        });
        child.once('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`exit ${code}: ${log}`));
        });
      });
      assert.match(log, /DISABLED/i);
      const res = await fetch(`${handle.base}/api/admin/entries`, { headers: { 'x-admin-token': 'logical-admin' } });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.match(body.error, /disabled/i);
    } finally {
      await stopServer(handle);
    }

    const ok = await startServer({ NODE_ENV: 'production', ADMIN_TOKEN: 'prod-secret' });
    try {
      const bad = await fetch(`${ok.base}/api/admin/entries`, { headers: { 'x-admin-token': 'wrong' } });
      assert.equal(bad.status, 401);
      const good = await fetch(`${ok.base}/api/admin/entries`, { headers: { 'x-admin-token': 'prod-secret' } });
      assert.equal(good.status, 200);
    } finally {
      await stopServer(ok);
    }
  });

  test('development keeps logical-admin default when ADMIN_TOKEN unset', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'logical-admin-dev-'));
    const port = await freePort();
    const env = { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'development', LOGICAL_DATA_DIR: dataDir, LOGICAL_DB: '' };
    delete env.ADMIN_TOKEN;
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/src/index.js'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const handle = { child, dataDir, base: `http://127.0.0.1:${port}` };
    let log = '';
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`startup: ${log}`)), 20000);
        child.stdout.on('data', (chunk) => {
          log += chunk;
          if (log.includes('Logical API')) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.stderr.on('data', (chunk) => {
          log += chunk;
        });
        child.once('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`exit ${code}: ${log}`));
        });
      });
      const res = await fetch(`${handle.base}/api/admin/entries`, { headers: { 'x-admin-token': 'logical-admin' } });
      assert.equal(res.status, 200);
    } finally {
      await stopServer(handle);
    }
  });
});

describe('4. /api/health does not expose DB path or Node version', () => {
  test('health JSON omits db and node fields', async () => {
    const handle = await startServer({ NODE_ENV: 'production', ADMIN_TOKEN: 'integration-test-only' });
    try {
      const body = await (await fetch(`${handle.base}/api/health`)).json();
      assert.equal(body.ok, true);
      assert.equal(body.service, 'logical-reference-api');
      assert.equal('db' in body, false);
      assert.equal('node' in body, false);
      assert.ok(body.time);
      const raw = JSON.stringify(body);
      assert.equal(raw.includes('logical.db'), false);
      assert.equal(/v\d+\.\d+\.\d+/.test(raw) && raw.includes('node'), false);
    } finally {
      await stopServer(handle);
    }
  });
});

describe('5. production 500 handler omits err.message', () => {
  test('boom route returns Internal error without detail in production', async () => {
    const handle = await startServer({
      NODE_ENV: 'production',
      ADMIN_TOKEN: 'integration-test-only',
      LOGICAL_TEST_ROUTES: '1'
    });
    try {
      const res = await fetch(`${handle.base}/api/__test/boom`);
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.equal(body.error, 'Internal error');
      assert.equal('detail' in body, false);
      assert.equal(JSON.stringify(body).includes('secret-leak'), false);
    } finally {
      await stopServer(handle);
    }
  });

  test('development still returns detail', async () => {
    const handle = await startServer({
      NODE_ENV: 'development',
      ADMIN_TOKEN: 'integration-test-only',
      LOGICAL_TEST_ROUTES: '1'
    });
    try {
      const res = await fetch(`${handle.base}/api/__test/boom`);
      assert.equal(res.status, 500);
      const body = await res.json();
      assert.match(body.detail, /secret-leak/);
    } finally {
      await stopServer(handle);
    }
  });
});

describe('6. vulnerable dependency versions are patched', () => {
  test('body-parser, qs, proxy-addr, and vite meet fixed floors', () => {
    const bodyParser = require('body-parser/package.json');
    const qs = require('qs/package.json');
    const proxyAddr = require('proxy-addr/package.json');
    const vite = require('vite/package.json');

    const gte = (ver, major, minor, patch) => {
      const [a, b, c] = String(ver).replace(/^v/, '').split('.').map((n) => Number(n) || 0);
      if (a !== major) return a > major;
      if (b !== minor) return b > minor;
      return c >= patch;
    };

    assert.ok(gte(bodyParser.version, 2, 4, 0), `body-parser ${bodyParser.version}`);
    const [qa, qb, qc] = String(qs.version).split('.').map((n) => Number(n) || 0);
    assert.ok(qa > 6 || (qa === 6 && (qb > 16 || (qb === 16 && qc >= 1))), `qs ${qs.version} still in advisory range`);
    assert.ok(gte(proxyAddr.version, 2, 0, 8), `proxy-addr ${proxyAddr.version}`);
    assert.ok(gte(vite.version, 8, 2, 4) || gte(vite.version, 8, 3, 0), `vite ${vite.version}`);
  });
});
