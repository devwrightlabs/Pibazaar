import { useState } from 'react'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useNotifications, useReadNotification, useReadAllNotifications } from '@/lib/api/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { Notification } from '@/lib/api/types'

type Tab = 'all' | 'unread'

const TYPE_ICONS: Record<string, string> = {
  message: '💬',
  payment: '💰',
  shipping: '📦',
  escrow: '🔒',
  review: '⭐',
}

function iconFor(type: string): string {
  return TYPE_ICONS[type] ?? '🔔'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth()
  const [tab, setTab] = useState<Tab>('all')
  const { data, isLoading, isError, refetch } = useNotifications()
  const readOne = useReadNotification()
  const readAll = useReadAllNotifications()

  const notifications: Notification[] = data?.notifications ?? []
  const unread = data?.unread ?? 0
  const visible = tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Empty>
          <EmptyHeader>
            <EmptyMedia>🔒</EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Log in to view your notifications.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-6 mx-auto max-w-2xl pb-24" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Notifications
        </h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" loading={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-secondary-bg)' }}>
        {(['all', 'unread'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={{
              backgroundColor: tab === t ? 'var(--color-card-bg)' : 'transparent',
              color: tab === t ? 'var(--color-gold)' : 'var(--color-subtext)',
            }}
          >
            {t === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>⚠️</EmptyMedia>
            <EmptyTitle>Could not load notifications</EmptyTitle>
            <EmptyDescription>Please try again.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </Empty>
      ) : visible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>🎉</EmptyMedia>
            <EmptyTitle>You&apos;re all caught up!</EmptyTitle>
            <EmptyDescription>No {tab === 'unread' ? 'unread ' : ''}notifications yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((notif) => (
            <li key={notif.id}>
              <button
                onClick={() => {
                  if (!notif.isRead) readOne.mutate(notif.id)
                }}
                className="w-full text-left rounded-2xl px-4 py-4 flex items-start gap-4 transition-all hover:opacity-90"
                style={{
                  backgroundColor: notif.isRead ? 'var(--color-card-bg)' : 'rgba(240,192,64,0.07)',
                  border: notif.isRead
                    ? '1px solid var(--color-border-token)'
                    : '1px solid rgba(240,192,64,0.2)',
                }}
              >
                <span className="text-2xl leading-none mt-0.5 shrink-0" aria-label={notif.type}>
                  {iconFor(notif.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-sm font-semibold leading-snug"
                      style={{ color: notif.isRead ? 'var(--color-text)' : 'var(--color-gold)' }}
                    >
                      {notif.title}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--color-subtext)' }}>
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  {notif.body && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-subtext)' }}>
                      {notif.body}
                    </p>
                  )}
                </div>
                {!notif.isRead && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: 'var(--color-gold)' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
