---
name: Pi signup hard gate
description: Why/how PiBazaar signup is gated to verified Pioneers, and the CORS/framing constraints that go with embedding in the Pi Browser.
---

# Pi signup hard gate

**Rule:** Account creation requires a valid Pi identity. The web client runs the
Pi SDK `authenticate(['username'])` (username scope only) and submits the
`accessToken`; the backend `/auth/signup` re-verifies it via the Pi Platform
(`verifyPiToken` → `GET /v2/me` with Bearer, no API key) BEFORE inserting the
user, and rejects with 403 if missing/invalid. The signup form stays username +
password only. Wallet/payments scope is requested separately at payment time
(`ConnectPiWalletToPay`), not at signup/login.

**Init + auto-login:** `Pi.init()` is treated as a Promise and awaited fully
(shared in-flight promise in `pi-sdk.ts`) before any `authenticate()`. Web auth
auto-triggers once on app load (silent, guarded by a ref; no-ops outside the Pi
Browser) and is also available via the manual "Log in with Pi" button; both share
one in-flight login promise to avoid a double-`authenticate` race.

**Why:** Product decision (user-confirmed) — only real Pioneers in the Pi Browser
may sign up; this blocks normal-browser/bot signups. The Pi SDK only exists inside
the Pi Browser, so signup is intentionally impossible elsewhere (mobile native
included).

**KYC limitation:** Pi's public `/v2/me` returns only `uid` + `username` (no KYC
boolean). "Verified Pioneer" therefore means "holds a valid Pi-issued identity
token" — the strongest gate the public API allows. Do not promise KYC-level
verification.

**How to apply:** Any new signup surface must obtain + forward a Pi access token.
Server is the source of truth — never trust a client "isVerified" flag.

# Pi Browser framing + CORS

- The app is embedded in the Pi Browser sandbox, so it must be frameable: emit
  `Content-Security-Policy: frame-ancestors` allowing `*.minepi.com`/`*.pi`/Replit
  domains and never send `X-Frame-Options: DENY`. Applied in both the API
  (`app.ts` middleware) and Vite (`server.headers` + `preview.headers`).
- CORS uses credentials. In development it reflects the request origin (Pi Browser
  + Replit preview rotate origins). **In production the server fails fast at
  startup if `CORS_ORIGINS` is empty** — refuse an open credentialed policy.
- Env stage is driven by `APP_ENV` (falls back to `NODE_ENV`): see `lib/env.ts`
  `APP_ENV`/`isProduction`/`CORS_ORIGINS`.
