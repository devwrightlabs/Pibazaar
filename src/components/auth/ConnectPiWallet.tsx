'use client'

import { useEffect, useState } from 'react'
import { authenticateWithPi, initPiSdk } from '@/lib/pi-sdk'

interface ConnectPiWalletProps {
  title?: string
  description?: string
  onConnected?: (connection: { piUsername: string | null; piWalletAddress: string | null }) => void
  onStatusChange?: (connected: boolean) => void
}

interface StatusResponse {
  connected: boolean
  pi_username: string | null
  pi_wallet_address: string | null
  error?: string
}

async function parseStatusResponse(response: Response): Promise<StatusResponse | null> {
  try {
    return (await response.json()) as StatusResponse
  } catch {
    return null
  }
}

export default function ConnectPiWallet({ title, description, onConnected, onStatusChange }: ConnectPiWalletProps) {
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [piUsername, setPiUsername] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadStatus = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
        if (!token) {
          if (mounted) setLoadingStatus(false)
          return
        }

        const response = await fetch('/api/auth/connect-pi', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await parseStatusResponse(response)

        if (!response.ok) {
          if (mounted) {
            setError(data?.error ?? 'Could not load Pi wallet status.')
            setLoadingStatus(false)
          }
          return
        }

        if (!mounted || !data) return

        setConnected(data.connected)
        setPiUsername(data.pi_username)
        setWalletAddress(data.pi_wallet_address)
        onStatusChange?.(data.connected)
        setLoadingStatus(false)
      } catch {
        if (mounted) {
          setError('Could not load Pi wallet status.')
          setLoadingStatus(false)
        }
      }
    }

    void loadStatus()

    return () => {
      mounted = false
    }
  }, [onStatusChange])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pibazaar-token') : null
      if (!token) {
        setError('Please log in first.')
        setConnecting(false)
        return
      }

      initPiSdk()
      const auth = await authenticateWithPi()

      if (!auth?.accessToken) {
        setError('Pi authentication failed. Please try again.')
        setConnecting(false)
        return
      }

      const response = await fetch('/api/auth/connect-pi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken: auth.accessToken,
          wallet_address: auth.user.wallet_address ?? null,
        }),
      })

      const data = await parseStatusResponse(response)

      if (!response.ok) {
        setError(data?.error ?? 'Could not connect Pi wallet.')
        setConnecting(false)
        return
      }

      if (!data) {
        setError('Could not connect Pi wallet.')
        setConnecting(false)
        return
      }

      setConnected(true)
      setPiUsername(data.pi_username)
      setWalletAddress(data.pi_wallet_address)
      onStatusChange?.(true)
      onConnected?.({
        piUsername: data.pi_username,
        piWalletAddress: data.pi_wallet_address,
      })
    } catch {
      setError('Could not connect Pi wallet.')
    } finally {
      setConnecting(false)
    }
  }

  if (loadingStatus) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'rgba(240,192,64,0.2)', backgroundColor: '#12121c' }}
        role="status"
        aria-live="polite"
      >
        <div className="inline-flex items-center gap-2 text-sm" style={{ color: '#F0C040' }}>
          <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Checking Pi wallet status...
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: connected ? 'rgba(34,197,94,0.45)' : 'rgba(240,192,64,0.3)',
        backgroundColor: '#12121c',
      }}
    >
      <h3 className="text-base font-semibold" style={{ color: '#F8F8F8' }}>
        {title ?? 'Connect Pi Wallet'}
      </h3>
      <p className="mt-1 text-sm" style={{ color: '#C8C8C8' }}>
        {description ?? 'Required when you publish listings or complete transactions.'}
      </p>

      {connected ? (
        <div className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(34,197,94,0.4)', color: '#86EFAC' }}>
          Connected as @{piUsername}
          {walletAddress ? <div className="mt-1 break-all">{walletAddress}</div> : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={connecting}
          className="mt-3 w-full rounded-xl px-4 py-3 font-semibold text-black transition-opacity disabled:opacity-70"
          style={{ backgroundColor: '#F0C040' }}
        >
          {connecting ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              Connecting...
            </span>
          ) : (
            'Connect Pi Wallet'
          )}
        </button>
      )}

      {error ? (
        <div
          className="mt-3 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.12)', color: '#FCA5A5' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
