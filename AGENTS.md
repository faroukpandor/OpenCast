# OpenCast agent instructions

Use only free, local/open-source resources. Do not add a required paid API, hosted model, API key, or telemetry service.

## Change discipline

1. Understand the real flow and read the callers before editing.
2. Prefer, in order: not adding code, reusing this repo, Node/browser standard APIs, an already installed dependency, then the smallest new implementation.
3. Never simplify away validation, authorization, error handling, accessibility, data-loss protection, or honest failure reporting.
4. Add or update a focused test for behavior changes. Mark deliberate deferrals with `shortcut: <limit>, <when to upgrade>`.
5. State what was verified, what was mocked, and what remains unverified. Do not claim hardware, live-feed, Docker, or security certification without evidence.

## Version grounding

Before using a library API, check the installed version and local types/docs (`npm ls <package>`, `package-lock.json`, `node_modules/<package>`). Context7 or another docs service may be used optionally for version-pinned documentation, but the app and its checks must continue to work without it.

## Evidence labels

- `extracted`: explicit in source/database (for example, a foreign-key relationship).
- `inferred`: computed by a heuristic (for example, related-issue keyword scoring).
- `unverified`: not exercised against the real external system/device.

## Gates

```bash
npm run check
npm run test:e2e
npm run test:e2e:production
npm audit
```

Keep the live preview on port 3000 with HMR sharing the HTTP server. Do not commit runtime SQLite files, `.env`, build output, or generated agent artifacts.
