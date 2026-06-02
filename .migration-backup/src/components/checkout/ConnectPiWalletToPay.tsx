'use client'

/**
 * ConnectPiWalletToPay
 *
 * Standalone component for connecting a Pi Wallet strictly for payment
 * purposes. This component must NEVER be used in the global onboarding flow —
 * it belongs exclusively on checkout and listing pages where a Pi transaction
 * is required.
 *
 * Usage:
 *   <ConnectPiWalletToPay onConnected={(walletAddress) => ...} />
 */

import { useState } from 'react'
import { initPiSdk, authenticateWithPi } from '@/lib/pi-sdk'

interface ConnectPiWalletToPayProps {
  /** Called with the user's Pi wallet address once the wallet is connected. */
  onConnected: (walletAddress: string) => void
  /** Optional override for the CTA label. */
  label?: string
}

interface ConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'error'
  walletAddress: string | null
  errorMessage: string | null
}

export default function ConnectPiWalletToPay({
  onConnected,
  label = 'Connect Pi Wallet to Pay',
}: ConnectPiWalletToPayProps) {
  const [state, setState] = useState<ConnectionState>({
    status: 'idle',
    walletAddress: null,
    errorMessage: null,
  })

  const handleConnect = async () => {
    setState({ status: 'connecting', walletAddress: null, errorMessage: null })

    // Ensure the SDK is initialised before attempting authentication
    const initialised = initPiSdk()
    if (!initialised) {
      setState({
        status: 'error',
        walletAddress: null,
        errorMessage: 'Pi SDK could not be initialised. Please open this page inside the Pi Browser.',
      })
      return
    }

    try {
      // 10-second timeout guard — prevents infinite loading if Pi SDK hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 10_000)
      )

      const auth = await Promise.race([authenticateWithPi(), timeoutPromise])

      if (!auth || !auth.user.wallet_address) {
        setState({
          status: 'error',
          walletAddress: null,
          errorMessage: 'Could not retrieve your Pi wallet address. Please try again.',
        })
        return
      }

      setState({
        status: 'connected',
        walletAddress: auth.user.wallet_address,
        errorMessage: null,
      })

      onConnected(auth.user.wallet_address)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wallet connection failed. Please try again.'
      console.error('[ConnectPiWalletToPay] Connection error:', err)
      setState({ status: 'error', walletAddress: null, errorMessage: message })
    }
  }

  if (state.status === 'connected' && state.walletAddress) {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}
      >
        <span className="text-lg">✅</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>
            Pi Wallet Connected
          </p>
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: '#9CA3AF', fontFamily: 'monospace' }}
            title={state.walletAddress}
          >
            {state.walletAddress}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={state.status === 'connecting'}
        className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-opacity"
        style={{
          backgroundColor: '#F0C040',
          color: '#000',
          fontFamily: 'Sora, sans-serif',
          opacity: state.status === 'connecting' ? 0.65 : 1,
        }}
      >
        {state.status === 'connecting' ? (
          <>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <span>π</span>
            {label}
          </>
        )}
      </button>

      {state.status === 'error' && state.errorMessage && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#FCA5A5',
          }}
        >
          {state.errorMessage}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: '#6B7280' }}>
        Your Pi Wallet is used only to authorise this payment.
      </p>
    </div>
  )
}
