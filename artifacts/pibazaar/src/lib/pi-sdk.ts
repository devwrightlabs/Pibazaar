// Pi SDK wrapper with try/catch for all calls

declare global {
  interface Window {
    Pi?: PiSDK
  }
}

interface PiSDK {
  // Pi SDK 2.0 returns a Promise from init(); older builds returned void. Treat
  // it as a Promise and await it fully before any authenticate()/payment call.
  init: (config: { version: string; sandbox: boolean }) => Promise<void> | void
  authenticate: (scopes: string[], onIncompletePaymentFound: (payment: PiPayment) => void) => Promise<PiAuthResult>
  createPayment: (paymentData: PiPaymentData, callbacks: PiPaymentCallbacks) => void
  openShareDialog: (title: string, message: string) => void
}

interface PiAuthResult {
  accessToken: string
  user: {
    uid: string
    username: string
    wallet_address?: string
  }
}

interface PiPayment {
  identifier: string
  user_uid: string
  amount: number
  memo: string
  metadata: Record<string, unknown>
  to_address: string
  created_at: string
  status: {
    developer_approved: boolean
    transaction_verified: boolean
    developer_completed: boolean
    cancelled: boolean
    user_cancelled: boolean
  }
  transaction: null | {
    txid: string
    verified: boolean
    _link: string
  }
}

interface PiPaymentData {
  amount: number
  memo: string
  metadata: Record<string, unknown>
}

interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void
  onReadyForServerCompletion: (paymentId: string, txid: string) => void
  onCancel: (paymentId: string) => void
  onError: (error: Error, payment?: PiPayment) => void
}

// ─── SDK initialization ───────────────────────────────────────────────────────

let piSdkInitialised = false
let piInitPromise: Promise<boolean> | null = null
let resolvedSandboxMode: boolean | null = null

function getPiSdk(): PiSDK | null {
  if (!(typeof window !== 'undefined' && window.Pi)) {
    return null
  }
  return window.Pi
}

/** The `sandbox` value the SDK was last initialised with (null before init). */
export function getResolvedSandboxMode(): boolean | null {
  return resolvedSandboxMode
}

// ─── Visual debugging ─────────────────────────────────────────────────────────
// The Pi Sandbox and Pi Browser have no dev console, so we expose optional
// `alert()`-based step tracing for the auth flow. Enable it by loading the app
// with `?pidebug=1` (sticky for the rest of the session) or by setting
// localStorage['pi-debug']='1' / VITE_PI_DEBUG=true. Disable with `?pidebug=0`.

export function isPiDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const flag = new URLSearchParams(window.location.search).get('pidebug')
    if (flag === '1') {
      window.localStorage?.setItem('pi-debug', '1')
      return true
    }
    if (flag === '0') {
      window.localStorage?.removeItem('pi-debug')
      return false
    }
  } catch {
    /* URL/localStorage unavailable */
  }
  try {
    if (window.localStorage?.getItem('pi-debug') === '1') return true
  } catch {
    /* localStorage unavailable */
  }
  return import.meta.env.VITE_PI_DEBUG === 'true'
}

/** Show a debug `alert()` only when Pi debug mode is enabled. */
export function piDebugAlert(message: string): void {
  if (typeof window === 'undefined' || !isPiDebugEnabled()) return
  try {
    window.alert(`[PiBazaar debug] ${message}`)
  } catch {
    /* alert blocked */
  }
}

/**
 * Decide whether to start the Pi SDK in sandbox (test) mode.
 *
 * The Pi Sandbox (https://sandbox.minepi.com) embeds the app in an iframe and
 * REQUIRES `Pi.init({ sandbox: true })` — otherwise its handshake never
 * completes and the sandbox sits forever on its "Translation loading…" screen.
 * The real Pi Browser (production) requires `sandbox: false`.
 *
 * Resolution order:
 *  1. Explicit build-time override `VITE_PI_SANDBOX` ("true" / "false").
 *  2. Auto-detect: if the app is embedded by a `sandbox.minepi.com` host
 *     (via iframe ancestor origins or the document referrer), use sandbox mode.
 *  3. Default to production mode (`false`).
 */
/** True only when `value` is a URL whose host is exactly the Pi Sandbox. */
function isPiSandboxUrl(value: string): boolean {
  try {
    return new URL(value).hostname === 'sandbox.minepi.com'
  } catch {
    return false
  }
}

function resolvePiSandboxMode(): boolean {
  const override = import.meta.env.VITE_PI_SANDBOX
  if (override === 'true') return true
  if (override === 'false') return false

  if (typeof window === 'undefined') return false

  try {
    const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList })
      .ancestorOrigins
    if (ancestors) {
      for (let i = 0; i < ancestors.length; i++) {
        if (isPiSandboxUrl(ancestors[i])) return true
      }
    }
  } catch {
    /* ancestorOrigins unavailable — fall through to referrer check */
  }

  try {
    if (typeof document !== 'undefined' && isPiSandboxUrl(document.referrer)) {
      return true
    }
  } catch {
    /* referrer unavailable */
  }

  return false
}

/**
 * Initialise the Pi SDK.
 *
 * Call this once on app startup (e.g. in a top-level layout or provider).
 * The `sandbox` flag controls whether the SDK operates in test mode.
 * The Pi SDK script (`https://app-cdn.minepi.com/version/2.0/pi.js`) must already be
 * loaded via a `<script>` tag before calling this function.
 *
 * CRITICAL: `Pi.init()` is treated as a Promise and awaited fully — this MUST
 * resolve before any authentication or wallet operation. Concurrent callers
 * share a single in-flight init Promise.
 */
export async function initPiSdk(): Promise<boolean> {
  if (piSdkInitialised) return true
  if (piInitPromise) return piInitPromise
  if (!(typeof window !== 'undefined' && window.Pi)) {
    console.warn('[pi-sdk] Pi SDK script is not loaded')
    return false
  }
  const pi = window.Pi

  const sandbox = resolvePiSandboxMode()
  resolvedSandboxMode = sandbox

  piInitPromise = (async () => {
    try {
      // Pi.init() returns a Promise in SDK 2.0 — await it fully before auth.
      await pi.init({ version: '2.0', sandbox })
      piSdkInitialised = true
      console.info(`[pi-sdk] Initialized successfully (sandbox: ${sandbox})`)
      return true
    } catch (error) {
      console.error('[pi-sdk] Initialization failed:', error)
      piInitPromise = null
      return false
    }
  })()

  return piInitPromise
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateWithPi(): Promise<PiAuthResult | null> {
  try {
    // Await Pi.init() fully before authenticate().
    const ready = await initPiSdk()
    if (!ready || !(typeof window !== 'undefined' && window.Pi)) {
      console.error('[pi-sdk] Wallet Connection Failed: Pi SDK not available')
      return null
    }

    const scopes = ['username', 'payments', 'wallet_address']
    const onIncompletePaymentFound = () => {}
    const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound)
    console.info('[pi-sdk] Wallet Connected! Welcome: ' + authResult.user.username)
    return authResult
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[pi-sdk] Wallet Connection Failed: ' + message)
    return null
  }
}

// ─── Payment creation ─────────────────────────────────────────────────────────

export function createPiPayment(
  paymentData: PiPaymentData,
  callbacks: PiPaymentCallbacks
): void {
  try {
    if (!(typeof window !== 'undefined' && window.Pi)) {
      console.warn('Pi SDK not available')
      callbacks.onError(new Error('Pi SDK not available'))
      return
    }
    const pi = window.Pi
    pi.createPayment(paymentData, callbacks)
  } catch (error) {
    console.error('Pi payment creation failed:', error)
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// ─── Server communication helpers ─────────────────────────────────────────────
// These are called from the client inside Pi SDK callbacks to relay payment
// lifecycle events to our backend.  The backend is the ONLY place that touches
// the Pi API key — it is never sent to the browser.

/**
 * Called from `onReadyForServerApproval`.
 *
 * Sends the `paymentId` to the existing escrow verify-payment route which
 * developer-approves the payment and links it to the escrow record.
 */
export async function approvePaymentOnServer(
  paymentId: string,
  escrowId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
    const res = await fetch('/api/escrow/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payment_id: paymentId, escrow_id: escrowId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      return { success: false, error: data.error ?? `Server returned ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    console.error('[pi-sdk] approvePaymentOnServer failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Called from `onReadyForServerCompletion`.
 *
 * Posts the payment completion data to `/api/pi/verify` which completes
 * the payment on the Pi blockchain and transitions the escrow to
 * `held_in_escrow`.
 */
export async function completePaymentOnServer(
  paymentId: string,
  txid: string,
  escrowId: string
): Promise<{ success: boolean; escrow_id?: string; error?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
    const res = await fetch('/api/pi/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ payment_id: paymentId, txid, escrow_id: escrowId }),
    })

    const data = await res.json().catch(() => ({})) as { success?: boolean; escrow_id?: string; error?: string }
    if (!res.ok) {
      return { success: false, error: data.error ?? `Server returned ${res.status}` }
    }
    return { success: true, escrow_id: data.escrow_id }
  } catch (err) {
    console.error('[pi-sdk] completePaymentOnServer failed:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ─── Price fetching ───────────────────────────────────────────────────────────

export async function fetchPiPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://api.minepi.com/v2/prices/pi')
    if (!response.ok) throw new Error('Failed to fetch Pi price')
    const data = await response.json() as { price?: number }
    return data.price ?? null
  } catch (error) {
    console.error('Failed to fetch Pi price:', error)
    return null
  }
}
