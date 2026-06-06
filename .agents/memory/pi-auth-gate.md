---
name: Pi signup hard gate
description: Why/how PiBazaar signup is gated to verified Pioneers, and the CORS/framing constraints that go with embedding in the Pi Browser.
---

# Pi signup hard gate

**Rule:** Account creation requires a valid Pi identity. The web client runs the
Pi SDK `authenticate(['username'])` (username scope only) and submits the
`accessToken`; the backend `/auth/signup` re-verifies it via the Pi Platform
(`verifyPiToken` → `GET /v2/me` with Bearer, no API key) BEFORE inserting the
user, and rejects with 403 if missing/invalid. The web auth UI is Pi-only — the
manual username/password sign-up + login form was removed in favour of a single
"Login with Pi" button (on both `/login` and the home hero); one Pi login
provisions a new user or returns an existing one. Wallet/payments scope is
requested separately at payment time (`ConnectPiWalletToPay`), not at login.
The legacy username/password `signup`/`login` provider methods + their UI
(forms, the sidebar "use username & password instead" link) were fully removed
from the web client — `PiAuthProvider` now exposes only `loginWithPi`.
`window.Pi.authenticate(['username'], onIncompletePaymentFound)` always passes
an `onIncompletePaymentFound` callback (module-level, console.warn) — the Pi SDK
requires it as the 2nd arg even for a username-only login.

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
- CORS uses credentials and resolves the allow-list with a layered fallback so it
  **never crashes on startup** (budget-sensitive deployments): (1) `CORS_ORIGINS`
  if set; (2) else `REPLIT_DOMAINS` mapped to `https://<host>` (logged warn);
  (3) else reflect the request origin (logged warn). The old "throw if empty in
  prod" behaviour was removed — failing closed on a missing Secret was killing
  deployments.
- Deployment healthcheck probes the API base path `/api`; the health router must
  answer `/` (not just `/healthz`) with 200 or the rollout is marked unhealthy.
- Env stage is driven by `APP_ENV` (falls back to `NODE_ENV`): see `lib/env.ts`
  `APP_ENV`/`isProduction`/`CORS_ORIGINS`.
