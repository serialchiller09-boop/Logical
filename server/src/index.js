import express from 'express';
import cors from 'cors';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, seed, DB_PATH } from './db.js';
import { router as referenceRouter } from './routes/reference.js';
import { stateRouter, adminRouter, resolveAdminAuth } from './routes/userState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_DIST = resolve(__dirname, '..', '..', 'web', 'dist');
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');

/* Same-origin by default. Cross-origin callers must be listed in CORS_ORIGINS
 * (comma-separated). credentials:true so an allowlisted UI can send the session cookie. */
const corsAllowlist = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Non-browser / same-origin proxied calls often omit Origin.
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes('*') || corsAllowlist.includes(origin)) {
      return callback(null, true);
    }
    // No Access-Control-Allow-Origin → browser blocks cross-origin reads.
    // Same-origin SPA traffic does not need the header.
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

getDb();
await seed({ force: false });

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'logical-reference-api',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

app.use('/api', referenceRouter);
app.use('/api', stateRouter);
app.use('/api', adminRouter);

/* Test-only route to exercise the 500 handler without polluting product APIs. */
if (process.env.LOGICAL_TEST_ROUTES === '1') {
  app.get('/api/__test/boom', () => {
    throw new Error('secret-leak-should-not-reach-client');
  });
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));

/* Serve notebook assets with HEAD/range support for browser PDF viewers. Missing
 * documents must be a real 404, not the SPA's index.html with a 200 response. */
app.use('/documents', express.static(join(WEB_DIST, 'documents'), { index: false }));
app.use('/documents', (_req, res) => res.status(404).type('text').send('Document not found'));

/* ---------- static SPA in production (vite build output) ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json'
};

function tryStatic(req, res) {
  if (!existsSync(WEB_DIST)) return false;
  const urlPath = decodeURIComponent((req.path === '/' ? '/index.html' : req.path).split('?')[0]);
  const candidate = resolve(WEB_DIST, '.' + urlPath);
  if (!candidate.startsWith(WEB_DIST)) return false;
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    res.setHeader('content-type', MIME[extname(candidate)] ?? 'application/octet-stream');
    createReadStream(candidate).pipe(res);
    return true;
  }
  return false;
}

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  if (tryStatic(req, res)) return;
  const index = join(WEB_DIST, 'index.html');
  if (existsSync(index)) {
    res.setHeader('content-type', MIME['.html']);
    return createReadStream(index).pipe(res); // SPA history fallback
  }
  res.status(200).type('html').send(`<!doctype html><meta charset="utf-8">
  <title>Logical API running</title>
  <body style="font:15px/1.6 ui-sans-serif,system-ui;background:#0d1117;color:#e6edf3;padding:40px">
  <h1>Logical reference API is up</h1>
  <p>No web build found at <code>web/dist</code>. In development the UI is served by Vite on its own port
  and proxies <code>/api</code> here.</p>
  <p>Try: <a style="color:#79c0ff" href="/api/sections">/api/sections</a> ·
  <a style="color:#79c0ff" href="/api/search?q=surge">/api/search?q=surge</a> ·
  <a style="color:#79c0ff" href="/api/tag?tag=PSHH-101">/api/tag?tag=PSHH-101</a></p>
  </body>`);
});

app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  const body = { error: 'Internal error' };
  if (!IS_PROD) {
    body.detail = String(err?.message ?? err);
  }
  res.status(500).json(body);
});

const adminAuth = resolveAdminAuth();
app.listen(PORT, HOST, () => {
  console.log(`\n  Logical API  ->  http://${HOST}:${PORT}`);
  console.log(`  sqlite       ->  ${DB_PATH}`);
  if (adminAuth.source === 'env') {
    console.log('  admin token  ->  from ADMIN_TOKEN env');
  } else if (adminAuth.source === 'dev-default') {
    console.log('  admin token  ->  ADMIN_TOKEN not set (using development default "logical-admin")');
  } else {
    console.log('  admin        ->  DISABLED in production until ADMIN_TOKEN is set');
  }
  console.log('');
});
