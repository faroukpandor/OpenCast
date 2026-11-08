# Tooling evaluation: what OpenCast adopted

Date: 2026-11-08. Constraint: **free resources only; no required paid API key or hosted model**.

| Project | Useful idea | What OpenCast adopted | What was deliberately not adopted |
|---|---|---|---|
| Ponytail | Minimal-complete-change discipline: understand the flow, reuse before adding, never cut validation/security/a11y/error handling, leave a focused test, state skipped work. | `AGENTS.md` change discipline and evidence labels; small tested additions instead of new services. | Prompt-plugin installation as a runtime dependency; unverified marketing reduction claims. |
| Graphify | Local deterministic graph extraction; label edges as extracted vs inferred; keep provenance visible. | `src/server/catalog_graph.ts` and the Knowledge Export **Graph** tab: device→issue→solution/source and shortcode→target edges, all `evidence: extracted`, with review status preserved. | Hosted/cloud review, semantic PDF/media passes requiring a model/API key, and inferred similarity edges in the portable export. |
| MixRoute | Provider/source resilience: cooldowns, circuit-breaker-style probing, persistent state, honest failure reporting, graceful shutdown. | Persistent per-source feed cooldowns in `ScraperService`: failures back off from 5 minutes to 6 hours, cooldowns are visible in results, success resets state. Existing graceful shutdown retained. | An OpenAI-compatible router or any paid/provider key. OpenCast has no generative model endpoint to route. |
| Playwright | Repeatable browser verification, production-mode checks, accessibility scanning. | Already used for dev/production workflows; added `@axe-core/playwright` WCAG A/AA scan for catalog, auth dialog, and mobile navigation; fixed contrast failures found by the scan. | Replacing real-device USB acceptance with browser emulation. |
| vibesec | Deterministic local security pattern checks and CI gating; avoid treating scanner output as certification. | `npm run security:check` guards dynamic code, unsafe HTML sinks, hardcoded credentials, TLS bypass, wildcard CORS, child-process imports, and interpolated SQL; tested positive/negative cases. | Installing an ambiguous/unmaintained scanner name as a trusted dependency; LLM remediation; claiming a penetration test. |
| Context7 | Ground library usage in exact installed versions instead of stale model memory. | `AGENTS.md` requires checking `npm ls`, lockfile, local types/docs before API use; optional version-pinned docs lookup is allowed but never required. | Making Context7 or any docs API a runtime/build requirement. |

## Sources

- Ponytail: https://github.com/DietrichGebert/ponytail
- Graphify: https://github.com/Graphify-Labs/graphify
- MixRoute: https://github.com/evdark/MixRoute
- Playwright accessibility testing: https://playwright.dev/docs/accessibility-testing
- vibesec examples: https://github.com/AyushkhatiDev/vibesec and https://github.com/stephenitram/vibesec
- Context7: https://github.com/upstash/context7

## Verification boundary

These additions are local and testable. They do not certify physical WebUSB behavior, live Reddit/YouTube availability, Docker image execution, firmware accuracy, or legal/security compliance. Those remain explicit release-checklist items in `docs/AUDIT.md` and `docs/DEPLOYMENT.md`.
