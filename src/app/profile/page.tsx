'use client'

import Link from 'next/link'
import { useStore } from '@/store/useStore'

export default function ProfilePage() {
  const { currentUser, isAuthenticated } = useStore()

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="min-h-screen px-4 py-8" style={{ backgroundColor: 'var(--color-background)' }}>
        <section
          className="mx-auto w-full max-w-md rounded-2xl border p-6 text-center"
          style={{ backgroundColor: '#12121c', borderColor: 'rgba(240,192,64,0.25)' }}
        >
          <h1 className="text-2xl font-bold" style={{ color: '#F8F8F8' }}>Your Profile</h1>
          <p className="mt-2 text-sm" style={{ color: '#C8C8C8' }}>
            Log in to view your account details.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/login"
              className="flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold"
              style={{ backgroundColor: '#F0C040', color: '#000' }}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="flex-1 rounded-xl border px-4 py-3 text-center text-sm font-semibold"
              style={{ borderColor: 'rgba(240,192,64,0.4)', color: '#F0C040' }}
            >
              Sign up
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <section
        className="mx-auto w-full max-w-md rounded-2xl border p-6"
        style={{ backgroundColor: '#12121c', borderColor: 'rgba(240,192,64,0.25)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: '#F0C040', color: '#000' }}
          >
            {(currentUser.username ?? 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F8F8F8' }}>@{currentUser.username}</h1>
            <p className="text-xs" style={{ color: '#C8C8C8' }}>User ID: {currentUser.id}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'rgba(240,192,64,0.2)', color: '#C8C8C8' }}>
          Pi wallet connection is intentionally deferred. You will be prompted to connect your wallet only when listing an item or completing a transaction.
        </div>
      </section>
    </main>
  )
}
