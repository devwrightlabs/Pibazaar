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

**The MANUAL login path surfaces errors; the SILENT auto-login path stays quiet.**
Every failure branch in `runPiLogin` is gated on `!silent`: a manual click sets a
visible `authError` for missing `window.Pi`, an `authenticate` throw (incl. "We
couldn't verify your app" = app/domain not verified in the **Pi Developer Portal**,
an external config issue NOT a code bug), a missing access token, and backend
token-exchange failure. The silent on-load attempt sets no UI/error state.
**Why:** an earlier design swallowed *all* `authenticate` failures, so a failing
login in the Pi Sandbox (which has no dev console) made the button look "completely
unresponsive" — no feedback at all. Surfacing on the manual path is the fix.
**Visual debugging:** `piDebugAlert()` (in `pi-sdk.ts`) shows `alert()` step traces
for the console-less Sandbox/Browser, gated behind `?pidebug=1` (sticky via
localStorage `pi-debug`) / `VITE_PI_DEBUG=true`; never fires for normal users.
**Login button disabled-state contract:** gate login CTAs on the *in-flight* login
state (`isLoggingIn` / local `piLoading`), NEVER on session-restore `isLoading` —
a stalled `GET /auth/me` must not be able to permanently disable the button. Use
`isLoading` only for identity visuals (avatar skeleton).

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

**App Studio "We Couldn't Verify Your App" + old UI is NOT a code bug.** If the
Pi App Studio "Verifying Your App" preview shows stale UI (e.g. the long-removed
username/password "Create account" form) and/or says it can't detect a sign-in,
the cause is the **URL registered in the Pi Developer Portal pointing at an old
build** — verify the live production bundle first (curl the prod URL, grep the
`/assets/index-*.js` bundle for removed strings). The Replit production
deployment is the source of truth; fix is to repoint the Developer Portal app
URL to the current deployment, not to change code.

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

# Pi SDK script URL (root cause of "Pi SDK not detected")

- The Pi SDK MUST be loaded from `https://sdk.minepi.com/pi-sdk.js` (real JS,
  ~1.1MB, `text/javascript`). The plausible-looking
  `https://app-cdn.minepi.com/version/2.0/pi.js` is WRONG — it 200s but returns
  an **HTML page** (`text/html`, ~1.5KB), which loads as a `<script>` but defines
  nothing, so `window.Pi` is silently never set and login "fails to detect the SDK".
  **Why:** the failure is invisible — script load succeeds (HTTP 200), there's no
  console in the Pi Browser/Sandbox, and the price feature still works because it's
  a plain REST `fetch` to `api.minepi.com` (no SDK), masking the real problem.
  **How to apply:** if `window.Pi` is undefined, first `curl -I` the SDK URL and
  confirm `content-type: text/javascript`. The `<script onerror>` in `index.html`
  records hard load failures to `window.__PI_SDK_LOAD_ERROR__`; `pi-sdk.ts`
  `waitForPiSdk()` polls for `window.Pi` (~4s) and `describePiSdkUnavailable()`
  builds the user-facing diagnostic.

# Pi SDK sandbox flag

- `Pi.init({ sandbox })` is environment-specific and getting it wrong is silent:
  the **Pi Sandbox** (`sandbox.minepi.com`) embeds the app in an iframe and
  REQUIRES `sandbox: true` — with `false` its handshake never completes and it
  hangs forever on its own purple "Translation loading…" overlay (the app itself
  renders fine everywhere else; symptom is sandbox-only). The **real Pi Browser**
  (production) needs `sandbox: false`.
  **Why:** a hardcoded flag can only satisfy one of the two; testing happens in
  the Sandbox while users live in the Pi Browser.
  **How to apply:** resolve it dynamically (see `pi-sdk.ts resolvePiSandboxMode`):
  `VITE_PI_SANDBOX` override → else auto-detect a `sandbox.minepi.com` embedder via
  `window.location.ancestorOrigins` / `document.referrer` → else `false`.
