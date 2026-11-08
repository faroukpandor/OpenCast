# OpenCast

A free, self-hosted streaming-device toolkit: hardware references, troubleshooting notes, real browser WebUSB ADB, local APK inspection, persistent package links, community reports, and opt-in analytics.

**No paid AI service, API key, hosted database, or external font service is required.** The assistant is a deterministic catalog search—not a generative model. It also searches the browser's cached catalog when offline.

## Run locally

Requires Node.js **22.12+** and npm. Node 22's built-in SQLite API emits an experimental warning; no native database addon is needed.

```bash
npm ci
cp .env.example .env       # optional; defaults work for local development
npm run dev
```

Open http://localhost:3000. Data persists in `data/opencast.sqlite`. There is **no default account**. Register a member account in the UI, or set all three `ADMIN_*` variables before first startup to bootstrap an administrator.

## Production

```bash
npm run build
NODE_ENV=production APP_URL=https://cast.example.com npm start
```

The build produces both the browser bundle (`dist/`) and a bundled Node server (`dist-server/server.js`). Production does not need `tsx`, Vite, TypeScript, or React packages at runtime. Put a TLS reverse proxy in front of the Node server and keep the SQLite directory on persistent storage.

For the included **loopback-only HTTP** Compose setup:

```bash
cp .env.example .env
docker compose up --build -d
curl http://localhost:3000/health
```

Compose explicitly disables secure cookies for local HTTP. For public deployment, set `APP_URL=https://your-host` and `COOKIE_SECURE=true`, configure the actual proxy hop count, and use a TLS proxy/tunnel. See [deployment](docs/DEPLOYMENT.md).

## Capabilities and boundaries

| Capability | Implementation | Boundary |
|---|---|---|
| Hardware / solutions | SQLite catalog, filters, related-issue scoring, source labels | Reference material, not certified fixes for every firmware |
| Assistant / export | Free local keyword retrieval; offline cached fallback; JSON-LD, Markdown, and explicit relationship graph export | No LLM, invented answers, or external AI calls; graph edges are extracted, not inferred |
| WebUSB ADB | Tango transport, device authorization, actual shell output, cancellation/timeouts | Supported Chromium + HTTPS/localhost + physical USB device; not wireless TCP or non-Android TVs |
| APK inspector | Local chunked SHA-256, bounded ZIP/binary-manifest parsing, permissions, optional checksum comparison | Not malware scanning, signing-certificate verification, or remote installation |
| Shortcodes | Persistent administrator-managed HTTPS links and `/s/:code` redirects | Deployment-specific, not universal Downloader codes |
| Community reports | Cookie sessions, browser proof of work, single-use challenges, idempotent offline retries | Public text; no moderation workflow or legal compliance guarantee |
| Analytics | Explicit opt-in, minimized paths/referrers, daily keyed IP hashes, 30-day retention | Operator must configure proxy trust and publish an appropriate privacy notice |
| Feed ingestion | Opt-in Reddit JSON / configured YouTube Atom, source attribution, deduplication, persistent failure cooldowns | Disabled by default; external availability/terms apply; live feeds not certified |
| PWA | Precached production shell/assets, cached public catalog, offline search and draft queue | Connect once first; live writes and USB require their respective connectivity/hardware |

## Verify

```bash
npm run check                 # source security guard, strict TypeScript, regression/API tests, client + server build
npm run test:e2e              # development browser workflows
npm run test:e2e:production   # production CSP, offline shell/search, icons, local hashing
npm run audit:dependencies    # production dependency audit
npm audit                     # include development dependencies
npm run db:backup -- ./backups/opencast.sqlite  # verified SQLite snapshot; refuses overwrite
```

Linux browser tests use the free Chromium binary and libraries already installed from npm. `scripts/prepare-browser.ts` extracts the bundled libraries automatically; no `apt`, browser download CDN, or manual `LD_LIBRARY_PATH` setup is required. Tests use an isolated in-memory database.

The automated suite does **not** emulate physical USB authorization or certify public feed availability. Docker configuration is provided; a Docker daemon was not available in the implementation sandbox. See [the audit and verification record](docs/AUDIT.md) for details.

## Project layout

- `server.ts`, `src/server/` — configuration, Express API, SQLite, retrieval, feed ingestion
- `src/components/` — catalog, device/APK studios, discussions, analytics, deployment tools
- `src/utils/` — shared retrieval, local hashing, APK parsing, proof of work, offline queue
- `public/` — PWA shell and locally generated icons
- `tests/`, `e2e/` — regression/API, browser, and axe accessibility coverage
- `scripts/` — browser setup, deterministic source security guard, and verified SQLite backup
- `docs/` — deployment, security, audit, and historical screenshots

The obsolete FastAPI/Astro prototypes and duplicated nested application have been removed. This root application is the single runnable implementation. Historical screenshots are not evidence of current hardware validation.
