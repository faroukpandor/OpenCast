# Security and privacy model

## Implemented controls

- Passwords use Node scrypt with unique random salts. Login performs a dummy hash for unknown identities. No default account or password exists.
- Sessions use 256-bit random tokens; only keyed token hashes are stored. Cookies are HTTP-only, SameSite=Strict, path-scoped, seven-day expiry, and Secure by default in production.
- Registration/login/reset/sensitive account/comment/chat endpoints have SQLite-backed rate limits that survive process restarts. Each limiter uses an isolated prefix/store instance. JSON schemas reject unknown fields, including forged author IDs. Write requests require JSON and reject cross-site origins.
- TOTP MFA uses RFC 6238 HMAC-SHA1, encrypted secrets (AES-256-GCM), accepted-step replay prevention, and one-time hashed recovery codes. Password changes/resets revoke sessions and outstanding reset tokens. Account deletion removes linked reports. Administrator recovery tokens are manual, hashed, single-use, and expire after one hour; administrators must verify requesters out of band.
- Administrator endpoints require a server-verified role. Admin bootstrap validates all settings before database creation and never promotes an existing account.
- Comment challenges expire after ten minutes and are consumed transactionally. SHA-256 proof of work binds challenge, page, exact trimmed content, and nonce. A UUID submission ID prevents duplicate posts when an offline client retries after a lost response.
- APK files stay in the browser. Input size, manifest extraction, string counts/lengths, and terminal output are bounded. Files are never executed. SHA-256 uses an open-source JavaScript implementation compatible with strict CSP.
- WebUSB commands require explicit confirmation. Connection and command waits have timeouts/cancellation and bounded output. Stopping a wait does not guarantee the device stopped executing.
- Feed ingestion is disabled by default, admin-triggered, limited to fixed/configured public sources, deduplicated by source URL, timeout/size bounded, and labeled unreviewed. Redirects are rejected. XML is parsed as data, not executed.
- Analytics is off until browser opt-in. Only a normalized page path, referrer origin, broad device class, and daily keyed IP hash are stored. Raw IP/user agent, query strings, and fragments are not stored. Events expire after 30 days.
- Production sends Helmet headers and a same-origin CSP. The service worker excludes APIs and authorization-bearing requests; it caches only the public shell/assets. The browser catalog cache contains public references and links, not accounts or discussions.

## Important limitations

This is not a penetration-test certificate. Hashing is pseudonymization, not a blanket GDPR/POPIA compliance claim. Operators remain responsible for lawful basis, consent notices, retention/data-subject requests, proxy configuration, and infrastructure security.

There is no password-reset email delivery service or malware scanner. Recovery is administrator-issued manual tokens, not automated email. Rate limiting is persistent for the intended single-process SQLite deployment, not a multi-region/distributed limiter. MFA is not a substitute for protecting the administrator bootstrap secret, database, backups, and host. Operators must configure `OPERATOR_NAME`/`PRIVACY_CONTACT`, source permissions, backup retention, and applicable legal notices before public community use.

The APK inspector does not verify APK signing certificates, certificate chains, runtime behavior, or publisher identity. A matching checksum is meaningful only if the expected checksum came independently from a trusted publisher. Declared permissions are informative, not a complete risk score.

The assistant retrieves existing catalog text. It does not reason like an LLM or certify commands. Reference commands can change device state; review them and back up first. Non-Android systems do not support Android ADB, and a browser cannot open arbitrary wireless ADB TCP sockets.

Offline drafts are plaintext in browser local storage. They are public once synced and use the session available at sync time. Rejected drafts remain visible for editing/removal rather than disappearing. Do not queue sensitive information on a shared device.

See the root `SECURITY.md` for private reporting. Repository owners should enable GitHub private vulnerability reporting; the automation token could not change that repository setting. Do not include real credentials, session cookies, or personal data in public issues.

## Deterministic source guard

`npm run security:check` scans application source for a small set of high-signal dangerous patterns (dynamic code evaluation, unescaped HTML sinks, hardcoded credentials, TLS bypasses, wildcard CORS, child-process imports, and interpolated SQL). It is a local guardrail, not a penetration test, secret-scanning history audit, or replacement for `npm audit`. The regression suite tests both positive and negative cases.
