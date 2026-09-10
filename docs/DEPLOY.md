# Deploy Logical as the full app

Logical is a **full-stack** app: one Node/Express server serves both the API and the built React files. The
server creates and uses a SQLite database on disk.

That means the production service needs three things:

1. **Node 22.12 or newer** — the app uses `node:sqlite`.
2. **A build step** — `npm ci && npm run build` creates `web/dist`.
3. **Persistent disk storage** if you want bookmarks, notes, and Plant data edits to survive redeploys.

The server listens on `PORT` and `HOST`; defaults are `8787` and `0.0.0.0`.

## Required environment variables

| Variable | Value | Why |
|---|---|---|
| `NODE_VERSION` | `22.22.3` or any Node `>=22.12.0` | Needed for `node:sqlite`. |
| `NODE_ENV` | `production` | Normal production mode. |
| `HOST` | `0.0.0.0` | Lets the host's router reach the app. |
| `ADMIN_TOKEN` | a long private string | Unlocks the Plant data admin screen. Do **not** use the dev default in production. |
| `LOGICAL_DATA_DIR` | a persistent mounted directory, for example `/var/data/logical` or `/data` | Stores `logical.db`. |

Optional: set `LOGICAL_DB=/full/path/logical.db` if you want to point at one exact SQLite file instead of a
directory.

## Fast path: Render

This repo includes `render.yaml`, so Render can create the web service from the repository.

Step by step:

1. Push this branch to GitHub.
2. In Render, choose **New +**.
3. Choose **Blueprint** if you want Render to read `render.yaml`, or choose **Web Service** and enter the same
   settings manually.
4. Connect the `serialchiller09-boop/Logical` repo.
5. Use these settings:
   - Runtime: **Node**
   - Build command: `npm ci && npm run verify`
   - Start command: `npm start`
   - Health check path: `/api/health`
6. Add environment variables:
   - `NODE_VERSION=22.22.3`
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `ADMIN_TOKEN=<make up a long private token>`
   - `LOGICAL_DATA_DIR=/var/data/logical`
7. Add a persistent disk:
   - Mount path: `/var/data`
   - Size: `1 GB` is plenty for this app to start with.
8. Deploy.
9. Open the Render URL. The app should load at `/`; health should return JSON at `/api/health`.
10. To use Plant data editing, open `/admin` and paste the exact `ADMIN_TOKEN` you set in Render.

Important: if you skip the persistent disk, the app still runs, but bookmarks, notes, and admin edits can be
lost when the service is rebuilt or moved.

## Railway

This repo includes `railway.json` and `nixpacks.toml`.

Step by step:

1. Create a new Railway project from the GitHub repo.
2. Let Railway use Nixpacks.
3. Add environment variables:
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `ADMIN_TOKEN=<make up a long private token>`
   - `LOGICAL_DATA_DIR=/data/logical`
4. Add a Railway volume mounted at `/data`.
5. Deploy.
6. Open the generated Railway URL.

Railway sets `PORT` automatically; the app reads it.

## Fly.io

This repo includes a `Dockerfile` and `fly.toml`.

Step by step:

1. Edit `fly.toml` and change `app = "logical"` to a unique Fly app name.
2. Run `fly launch` or `fly apps create <your-app-name>`.
3. Create a volume in the same region:

   ```bash
   fly volumes create logical_data --size 1 --region dfw
   ```

4. Set the admin token:

   ```bash
   fly secrets set ADMIN_TOKEN='make-up-a-long-private-token'
   ```

5. Deploy:

   ```bash
   fly deploy
   ```

6. Open the app:

   ```bash
   fly open
   ```

## VPS or any Docker host

Build and run the image:

```bash
docker build -t logical .
docker run -d \
  --name logical \
  -p 8787:8787 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=8787 \
  -e ADMIN_TOKEN='make-up-a-long-private-token' \
  -e LOGICAL_DATA_DIR=/data \
  -v logical-data:/data \
  logical
```

Then open:

```text
http://your-server-ip:8787
```

For public use, put it behind HTTPS with a reverse proxy such as Caddy, Nginx, Cloudflare Tunnel, or your host's
built-in HTTPS router.

## Verify before deploying

Run this locally or in CI:

```bash
npm ci
npm run verify
```

`npm run verify` builds the React app and runs the test suite.

## Backups

The important runtime files are the SQLite database files in `LOGICAL_DATA_DIR`, usually:

```text
logical.db
logical.db-shm
logical.db-wal
```

Back up that directory if Plant data edits, notes, or bookmarks matter to you. The reference content itself is
already in git under `server/src/seed/data`.
