# Deployment and operations

## Requirements

- Node.js 22.12+ for direct deployment; the Dockerfile uses Node 22.
- Persistent writable disk for SQLite. One application process per database is the intended deployment.
- HTTPS for public use. WebUSB additionally requires a secure browser context and compatible hardware.
- No account or paid API is needed. Hosting, domain, and hardware costs depend on your own infrastructure; nothing here promises a permanently free hosting tier.

## Configuration

Copy `.env.example` to `.env`. The server validates configuration before opening the database.

| Variable | Meaning |
|---|---|
| `PORT` | Listen port, default 3000; binds `0.0.0.0` |
| `NODE_ENV` | `production` enables the built bundle and production security defaults |
| `DATABASE_PATH` | SQLite path; Compose uses `/app/data/opencast.sqlite` |
| `APP_URL` | Exact public origin, e.g. `https://cast.example.com`; no path/query/credentials |
| `COOKIE_SECURE` | Defaults true in production. False is an explicit local-HTTP override, not a public-deployment setting |
| `TRUST_PROXY_HOPS` | Number of trusted reverse proxies immediately before Node, 0–5. Default 0 trusts no forwarded headers |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Set all three to bootstrap an admin if neither identity exists. Password 12–128 characters. Existing users are never promoted or overwritten |
| `ANALYTICS_SECRET` | Optional random secret, at least 32 characters. Otherwise generated and persisted in SQLite |
| `ENABLE_SCRAPERS` | `true` or `false`; default false. An admin must still trigger ingestion |
| `YOUTUBE_CHANNEL_IDS` | Up to five valid `UC...` IDs, comma-separated |

Do not commit `.env`, database files, WAL files, or backups containing user data.

## Direct Node deployment

```bash
npm ci
npm run check
npm run test:e2e
npm run test:e2e:production
npm run build
NODE_ENV=production APP_URL=https://cast.example.com npm start
```

Run `dist-server/server.js` under your service manager. Keep `dist/`, `dist-server/`, `package.json`, and production `node_modules/` together. Frontend/build/test dependencies are development-only; the server bundle uses external runtime packages and Node's built-in SQLite.

## Docker Compose

The supplied file binds port 3000 to **127.0.0.1 only** and explicitly defaults to non-secure cookies for local HTTP:

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
curl http://localhost:3000/health
```

For public HTTPS use, set `APP_URL=https://cast.example.com`, `COOKIE_SECURE=true`, and the correct `TRUST_PROXY_HOPS` in `.env`. Put TLS in front; do not expose the plain HTTP port directly. If accessing locally via `127.0.0.1` instead of `localhost`, set `APP_URL=http://127.0.0.1:3000` so the origin check matches.

The runtime image runs as `node`, contains no TypeScript runner, and stores data in the `opencast_data` volume. The image build prunes development dependencies after compiling both bundles. Docker itself was unavailable in the implementation sandbox, so the image/daemon deployment remains an operator verification item.

## Reverse proxy / Cloudflare Tunnel

Proxy to the Node service, preserve the public Host, and configure WebSocket/HTTP forwarding as required by your proxy. The production app does not need Vite or HMR. A named Cloudflare Tunnel can point to `http://localhost:3000`; configure its credentials on your own server. Check current provider terms and limits—this project does not assume unlimited free tunnel/hosting service.

Set `APP_URL` to the exact browser origin. Count only proxies you control when setting `TRUST_PROXY_HOPS`; trusting arbitrary forwarded headers weakens per-IP rate limiting. Production CSP allows same-origin scripts/fonts/assets, inline styles, and local data fonts. It does not allow third-party scripts or arbitrary JavaScript eval.

## Backups and retention

- Use `npm run db:backup -- ./backups/opencast-YYYY-MM-DD.sqlite` to create a consistent `VACUUM INTO` snapshot and run `integrity_check` on the copy. It refuses to overwrite an existing destination. Do not copy only the main file while WAL activity is ongoing.
- Back up the database and any explicitly configured analytics secret. Test restoration into a separate instance.
- Sessions/challenges expire; analytics older than 30 days is purged at startup and hourly.
- Accounts, comments, catalog entries, and shortcodes persist until explicitly removed. There is no account-deletion/moderation UI yet; operators must define a data-request process before public community use.
- Browser caches and offline drafts are local to each browser. Clear site data to remove them.

## Health and shutdown

`GET /health` checks SQLite and returns service/version metadata. SIGTERM/SIGINT stops accepting connections, closes idle connections, closes Vite in development, and closes SQLite. A ten-second deadline prevents an indefinite shutdown.

## Release checklist

1. Run checks, browser suites, and dependency audits on the release commit.
2. Build and smoke-test the container on a Docker-capable host.
3. Verify HTTPS login, secure/HTTP-only cookie, logout, and cross-origin write rejection.
4. Verify a real authorized Android USB device and cancellation on the target browser/OS.
5. If enabling feeds, verify source terms and actual responses; failures must remain visible.
6. Verify offline reload after one online visit, cached search, and queued-report sync.
7. Test database backup restoration (`npm run db:backup`, then open the copy with `DATABASE_PATH` pointing at it) and publish an operator privacy/contact notice.
