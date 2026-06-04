---
name: Pi signup hard gate
description: Why/how PiBazaar signup is gated to verified Pioneers, and the CORS/framing constraints that go with embedding in the Pi Browser.
---

# Pi signup hard gate

**Rule:** Account creation requires a valid Pi identity. The client (web + mobile)
runs the Pi SDK `authenticate(['username','payments','wallet_address'])` in the
background and submits the `accessToken`; the backend `/auth/signup` re-verifies it
via the Pi Platform (`verifyPiToken`) BEFORE inserting the user, and rejects with
403 if missing/invalid. The signup form stays username + password only.

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
