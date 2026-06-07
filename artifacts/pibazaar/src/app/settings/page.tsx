import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useUIStore } from '@/store/useUIStore'
import { useUpdateProfile } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { ApiError } from '@/lib/api/client'
import type { ThemePreference, JurisdictionMode } from '@/lib/api/types'

const DIVIDER = '1px solid var(--color-control-bg)'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-base font-bold" style={{ color: 'var(--color-text)' }}>
      {children}
    </h2>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: 'var(--color-card-bg)' }}
    >
      {children}
    </div>
  )
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-card-bg)' }}>
        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
          Delete Account
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-subtext)' }}>
          Contact support to delete your account. Please reach out to{' '}
          <span style={{ color: 'var(--color-gold)' }}>support@pibazaar.app</span> and we will process your request within 7 business days.
        </p>
        <Button variant="default" onClick={onClose} className="w-full">
          Got it
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, refresh, logout } = useAuth()
  const themeMode = useUIStore((s) => s.themeMode)
  const setThemeMode = useUIStore((s) => s.setThemeMode)
  const jurisdictionMode = useUIStore((s) => s.jurisdictionMode)
  const setJurisdictionMode = useUIStore((s) => s.setJurisdictionMode)
  const updateProfile = useUpdateProfile()

  const [walletAddress, setWalletAddress] = useState('')
  const [theme, setTheme] = useState<ThemePreference>('dark')
  const [jurisdiction, setJurisdiction] = useState<JurisdictionMode>('global')
  const [toast, setToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed local form state from the authenticated user / UI store.
  useEffect(() => {
    if (user) {
      setWalletAddress(user.walletAddress ?? '')
      setTheme(user.themePreference)
      setJurisdiction(user.jurisdictionMode)
    }
  }, [user])

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next)
    setThemeMode(next)
  }

  const handleJurisdictionChange = (next: JurisdictionMode) => {
    setJurisdiction(next)
    setJurisdictionMode(next)
  }

  const handleSave = () => {
    setError(null)
    updateProfile.mutate(
      {
        walletAddress: walletAddress.trim() || undefined,
        themePreference: theme,
        jurisdictionMode: jurisdiction,
      },
      {
        onSuccess: () => {
          void refresh()
          setToast(true)
          setTimeout(() => setToast(false), 2000)
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save settings. Please try again.'),
      },
    )
  }

  if (isLoading) {
    return (
      <main className="min-h-screen pb-32" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="px-4 pt-6 max-w-2xl mx-auto space-y-5">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton shape="card" />
          <Skeleton shape="card" />
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>🔒</EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Log in to manage your settings.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <SettingsInner
      username={user?.username ?? ''}
      walletAddress={walletAddress}
      setWalletAddress={setWalletAddress}
      theme={theme}
      onThemeChange={handleThemeChange}
      jurisdiction={jurisdiction}
      onJurisdictionChange={handleJurisdictionChange}
      themeMode={themeMode}
      onSave={handleSave}
      onLogout={logout}
      saving={updateProfile.isPending}
      toast={toast}
      error={error}
    />
  )
}

interface InnerProps {
  username: string
  walletAddress: string
  setWalletAddress: (v: string) => void
  theme: ThemePreference
  onThemeChange: (t: ThemePreference) => void
  jurisdiction: JurisdictionMode
  onJurisdictionChange: (j: JurisdictionMode) => void
  themeMode: string
  onSave: () => void
  onLogout: () => void
  saving: boolean
  toast: boolean
  error: string | null
}

function SettingsInner(props: InnerProps) {
  const {
    username,
    walletAddress,
    setWalletAddress,
    theme,
    onThemeChange,
    jurisdiction,
    onJurisdictionChange,
    onSave,
    onLogout,
    saving,
    toast,
    error,
  } = props
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const themeOptions: { key: ThemePreference; label: string; emoji: string }[] = [
    { key: 'dark', label: 'Dark', emoji: '🌙' },
    { key: 'light', label: 'Light', emoji: '☀️' },
  ]
  const jurisdictionOptions: { key: JurisdictionMode; label: string; desc: string }[] = [
    { key: 'local', label: 'Local', desc: 'Prioritise nearby listings' },
    { key: 'global', label: 'Global', desc: 'Show listings everywhere' },
  ]

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-subtext)' }}>
            Manage your account and preferences
          </p>
        </div>

        {/* Account */}
        <section>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <span className="text-sm" style={{ color: 'var(--color-subtext)' }}>
                Username
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                @{username}
              </span>
            </div>
            <div className="px-4 py-4" style={{ borderTop: DIVIDER }}>
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--color-subtext)' }}>
                Pi Wallet Address
              </label>
              <Input
                value={walletAddress}
                placeholder="G..."
                onChange={(e) => setWalletAddress(e.target.value)}
                className="font-mono"
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--color-subtext)' }}>
                Payouts from completed sales are sent here.
              </p>
            </div>
          </Card>
        </section>

        {/* Appearance */}
        <section>
          <SectionLabel>Appearance</SectionLabel>
          <Card>
            <div className="grid grid-cols-2 gap-3 p-4">
              {themeOptions.map(({ key, label, emoji }) => {
                const active = theme === key
                return (
                  <button
                    key={key}
                    onClick={() => onThemeChange(key)}
                    className="rounded-xl p-4 text-left transition-all"
                    style={{
                      backgroundColor: 'var(--color-secondary-bg)',
                      border: `2px solid ${active ? 'var(--color-gold)' : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                        {label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </section>

        {/* Marketplace */}
        <section>
          <SectionLabel>Marketplace</SectionLabel>
          <Card>
            <div className="grid grid-cols-2 gap-3 p-4">
              {jurisdictionOptions.map(({ key, label, desc }) => {
                const active = jurisdiction === key
                return (
                  <button
                    key={key}
                    onClick={() => onJurisdictionChange(key)}
                    className="rounded-xl p-4 text-left transition-all"
                    style={{
                      backgroundColor: 'var(--color-secondary-bg)',
                      border: `2px solid ${active ? 'var(--color-gold)' : 'transparent'}`,
                    }}
                  >
                    <span className="text-sm font-bold block" style={{ color: 'var(--color-text)' }}>
                      {label}
                    </span>
                    <span className="text-xs mt-1 block" style={{ color: 'var(--color-subtext)' }}>
                      {desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </section>

        {/* Account actions — Log Out sits directly above Delete Account */}
        <section>
          <SectionLabel>Account Actions</SectionLabel>
          <Card>
            <div className="space-y-3 p-4">
              <Button variant="outline" size="lg" onClick={onLogout} className="w-full">
                Log Out
              </Button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
                style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--color-error)', minHeight: 44 }}
              >
                Delete Account
              </button>
            </div>
          </Card>
        </section>

        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-error)' }}>
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          </div>
        )}

        <Button variant="default" size="lg" loading={saving} onClick={onSave} className="w-full">
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>

      {toast && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl font-semibold text-sm shadow-xl z-50"
          style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
        >
          ✓ Settings saved!
        </div>
      )}

      {showDeleteModal && <DeleteModal onClose={() => setShowDeleteModal(false)} />}
    </main>
  )
}
