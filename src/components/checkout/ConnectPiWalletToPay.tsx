'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { authenticateWithPi, initPiSdk } from '@/lib/pi-sdk'

interface ConnectPiWalletToPayProps {
  onConnected: () => void
  disabled?: boolean
}

export default function ConnectPiWalletToPay({
  onConnected,
  disabled = false,
}: ConnectPiWalletToPayProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Pi) {
      setSdkLoaded(true)
    }
  }, [])

  const handleConnect = async () => {
    if (disabled || connecting) return
    setConnecting(true)
    setError(null)
    try {
      if (!initPiSdk()) {
        setError('Pi SDK is unavailable. Please refresh and try again.')
        return
      }

      const auth = await authenticateWithPi()
      if (!auth?.accessToken) {
        setError('Pi Wallet connection failed. Please try again.')
        return
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
      const response = await fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          accessToken: auth.accessToken,
          walletAddress: auth.user?.wallet_address ?? null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string }
        setError(payload.error ?? 'Wallet connected but could not be linked to your account.')
        return
      }

      onConnected()
    } catch (err) {
      console.error('[ConnectPiWalletToPay] Wallet connect failed:', err)
      setError('Could not connect Pi Wallet.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-2">
      {!sdkLoaded && (
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="afterInteractive"
          onLoad={() => setSdkLoaded(true)}
        />
      )}

      <button
        onClick={() => void handleConnect()}
        disabled={disabled || connecting || !sdkLoaded}
        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-opacity"
        style={{
          backgroundColor: 'var(--color-control-bg)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          opacity: disabled || connecting || !sdkLoaded ? 0.7 : 1,
        }}
      >
        {connecting ? 'Connecting Pi Wallet...' : !sdkLoaded ? 'Loading Pi Wallet...' : 'Connect Pi Wallet to Pay'}
      </button>

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
