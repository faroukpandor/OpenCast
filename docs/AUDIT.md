# OpenCast development audit

Audit date: 2026-11-08. Baseline: `e976987a2aea846649c85c3e94faf55a1f50b335`.

## Executive result

The repository contained three drifting implementations, simulated device/AI behavior, hard-coded credentials, misleading verification claims, and nonpersistent application state. The root React/Express application is now the sole implementation, with persistent SQLite, real local file/device operations, free deterministic retrieval, and explicit capability boundaries.

The user requested **only free resources**. Gemini and its configuration/dependency were removed. Fonts, icons, hashing, browser test binaries, and application libraries are local/open-source. Optional public-feed access uses no paid API, but source availability and terms are outside this project's control.

## Findings and resolution

| Area | Baseline problem | Resolution |
|---|---|---|
| Architecture | Root app plus obsolete FastAPI/Astro and duplicated nested app | Removed obsolete trees; one strict TypeScript application and lockfile |
| Persistence | Accounts/reports/links/analytics reset or used browser-only state | SQLite schema, foreign keys, transactions, restart tests, persistent data volume |
| Authentication | Demo credentials, browser token storage, caller-controlled identity | No default account; scrypt; random hashed cookie sessions; strict schemas; admin boundaries |
| Configuration | Weak admin validation after store creation; implicit proxy/cookie behavior | Validate before opening DB; explicit origin/proxy/cookie/feed settings; local HTTP override documented |
| Discussions | Simulated PoW/replay and duplicate offline submissions | Real browser SHA-256 PoW, bound single-use challenges, UUID idempotency, retained rejected drafts |
| Assistant / export | Paid external generation and fabricated grounding | Free shared catalog retrieval online/offline; JSON-LD/Markdown/explicit graph export; no API key; honest no-match response |
| APK inspection | Allowlisted/fake reports and incompatible parser dependency | Actual chunked SHA-256 and bounded binary XML/ZIP parsing; UTF-16 extended-length regression; strict-CSP-compatible Noble hash |
| WebUSB | Simulated connection/output and incomplete cancellation | Tango USB transport/auth/shell; confirmation, timeout, reader cancellation, late-result cleanup, output bound |
| Shortcodes | Invented universal codes/checksums | Persistent admin-managed HTTPS registry; upstream defaults without fabricated checksums |
| Analytics | Fabricated counts and absolute privacy claims | Opt-in real aggregates, minimized inputs, keyed daily hashes, retention purge, explicit limitations |
| Feeds | Unbounded/unreliable ingestion presented as verified | Disabled/admin-only, fixed/configured sources, size/time bounds, deduplication, persistent failure cooldowns, honest failure results |
| Offline/PWA | Shell did not reliably cache built assets; assistant failed offline | Content-hashed precache manifest, syntax-checked worker, validated public catalog cache, offline retrieval/shortcode fallback |
| Accessibility/UI | Inaccessible dialogs/labels, mobile overflow, stale source explorer | Focus-trapped dialogs, explicit labels, mobile navigation, responsive filters, live source map |
| Deployment | Runtime pruned required TypeScript runner; PNG ignore removed icons; secure cookies broke local HTTP | Bundled Node server, runtime-only dependency smoke test, corrected ignore rules, explicit loopback Compose override |
| Verification | No repeatable regression/browser gate | Node tests, API tests, Playwright development/production suites, axe accessibility scan, deterministic source security guard, verified SQLite backup, CI workflow, dependency audits |

## Automated verification

Version 2.2.0 implementation results (2026-11-08/09 UTC):

- `npm run check`: deterministic source guard (46 application files), strict TypeScript, **31 regression/API tests**, production client/server builds passed. New coverage includes RFC 6238 vectors, encrypted MFA/recovery lifecycle, password reset/session revocation, account deletion, moderation authorization, persistent SQLite rate limits, and Reddit default-off behavior.
- `npm run test:e2e`: **7 development browser workflows passed**, including account settings/MFA setup/password change/deletion and axe WCAG A/AA scans of catalog, authentication, privacy notice, and mobile navigation. Two production-only cases are intentionally skipped in this mode.
- `npm run test:e2e:production`: **2 production workflows passed** against the compiled server.
- `npm run verify:https`: passed locally and in CI using a real OpenSSL self-signed TLS proxy: Secure/HttpOnly/SameSite=Strict cookie, authenticated session, cross-origin write rejection, and exactly one trusted proxy hop.
- GitHub Actions `container` job passed: Docker Compose build/start, `/health`, non-root UID 1000, runtime without `tsx`, bundled backup command, persistent volume/session/login across restart, and graceful exit code 0. See run 42564195558 (container job passed; the same run's regression assertion was subsequently corrected).
- `npm audit` and `npm audit --omit=dev`: **0 reported vulnerabilities** at audit time.
- `git diff --check`: passed.

### Live feed probe result

A real GitHub Actions probe (`npm run probe:feeds`) ran against the public Google Developers YouTube channel. Reddit was correctly skipped without access approval. YouTube returned **HTTP 404**, so the probe failed honestly and ingested zero reports (run 42564195705). Public reports also describe intermittent YouTube RSS 404 outages in 2026; this project does not convert that into a success. The scheduled/manual probe remains available after merge to `main`, and operators can rerun it with their own channel IDs. No paid YouTube API key was added.

## Explicitly unverified / outside scope

- **Physical WebUSB hardware:** no authorized Android device was attached. Use `docs/HARDWARE_ACCEPTANCE.md`; browser disconnected-state tests are not hardware certification.
- **Live Reddit ingestion:** intentionally gated off until the operator obtains Reddit permission. No permission was fabricated.
- **Live YouTube availability:** the actual CI probe observed HTTP 404; availability is external and not certified.
- **Operator/legal identity:** the code exposes `OPERATOR_NAME`/`PRIVACY_CONTACT` and an in-app notice, but cannot invent the deployment operator's identity, lawful basis, jurisdiction-specific notice, or backup retention policy.
- **Private vulnerability reporting setting:** root `SECURITY.md` documents the advisory path; the automation token received HTTP 403 when trying to enable the repository setting. A repository owner must enable it in GitHub settings.
- **Hardware reference accuracy:** catalog entries are reference notes, not manufacturer certification.
- **Security certification:** no penetration test or compliance certification is implied. APK signing-certificate verification and malware scanning remain explicit non-capabilities; recovery is manual admin tokens, not email delivery.

Historical images in `docs/screenshots/` predate this verification and are not proof of hardware validation or current behavior.

See `docs/TOOLING.md` for the free-only evaluation of Ponytail, Graphify, MixRoute, Playwright, vibesec, and Context7, and exactly which patterns were adopted.
