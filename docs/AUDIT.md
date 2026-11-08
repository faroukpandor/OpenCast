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

Latest implementation results:

- `npm run check`: deterministic source security guard, strict TypeScript, **25 regression/API tests**, production client and server builds passed.
- `npm run test:e2e`: **6 development browser workflows passed**, including an axe WCAG A/AA scan; production-only cases intentionally skipped in this mode.
- `npm run test:e2e:production`: **2 production workflows passed** against the compiled server, including offline reload/search/shortcode lookup and APK hashing under production CSP.
- `npm audit` and `npm audit --omit=dev`: **0 reported vulnerabilities** at audit time.
- Production-only dependency installation (`npm ci --omit=dev`) started the compiled server, served `/health` and `/`, and shut down gracefully with `tsx` absent.
- `git diff --check`: passed.

Browser coverage includes catalog filtering/search/related navigation, graph export, registration cookie properties, real PoW persistence, local APK checksum, persistent shortcode lookup, free assistant retrieval, disconnected WebUSB honesty, analytics opt-in, mobile navigation, axe accessibility scanning, production icons/fonts, and offline behavior. Browser setup extracts npm-bundled Chromium libraries automatically on Linux.

Remote GitHub Actions verification passed on implementation commit `4cbdece` for both the branch push and PR #1 (Ubuntu/Node 22). Tests do not use a real Android device or live public feeds. Scraper tests cover mocked success, blocked responses, and malformed responses.

## Explicitly unverified / outside scope

- **Physical WebUSB hardware:** no authorized Android device was attached. Browser/OS permission behavior and real command execution need a hardware acceptance test.
- **Live Reddit/YouTube ingestion:** external endpoints were not certified; Reddit may block unauthenticated requests.
- **Docker daemon/image execution:** Docker was unavailable. Dockerfile/Compose were corrected and the equivalent production-only Node dependency path was smoke-tested, but an image build/run remains a release checklist item.
- **Hardware reference accuracy:** catalog entries are reference notes, not manufacturer certification. Obvious non-Android ADB port claims and unsafe blanket commands were removed/corrected; exact firmware behavior still requires validation.
- **Security/legal certification:** no penetration test or compliance certification is implied. MFA, password-reset email, moderation/account-deletion workflows, and distributed rate limiting are not implemented.

Historical images in `docs/screenshots/` predate this verification and are not proof of hardware validation or current behavior.

See `docs/TOOLING.md` for the free-only evaluation of Ponytail, Graphify, MixRoute, Playwright, vibesec, and Context7, and exactly which patterns were adopted.
