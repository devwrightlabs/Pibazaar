

import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ChatThreadRow } from '@/types/database'
import { useStore } from '@/store/useStore'

export default function MessagesPage() {
  const { currentUser } = useStore()
  const [threads, setThreads] = useState<ChatThreadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) { setLoading(false); return }
    const fetchThreads = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('chat_threads').select('*')
        .or(`buyer_id.eq.${currentUser.pi_uid},seller_id.eq.${currentUser.pi_uid}`)
        .order('id', { ascending: false })
      if (error) console.error('[messages] Error:', error)
      setThreads((data as unknown as ChatThreadRow[]) || [])
      setLoading(false)
    }
    fetchThreads()
  }, [currentUser])

  if (!currentUser) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--color-subtext)' }}>Please log in to view messages</p>
          <Link href="/login"><button className="mt-4 px-6 py-3 rounded-xl font-semibold" style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}>Log In</button></Link>
        </div>
      </main>
    )
  }
  if (loading) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="px-4 pt-6 pb-4">{[1,2,3].map(i => <div key={i} className="skeleton-shimmer h-20 w-full rounded-xl mb-3" />)}</div>
      </main>
    )
  }
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}>Messages</h1>
        {threads.length === 0 ? (
          <div className="text-center py-16"><p style={{ color: 'var(--color-subtext)' }}>No conversations yet</p></div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => {
              const other = thread.buyer_id === currentUser.pi_uid ? thread.seller_id : thread.buyer_id
              return (
                <Link key={thread.id} href={`/messages/${thread.id}`}>
                  <div className="p-4 rounded-xl hover:opacity-80" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border-token)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-gold)' }}>
                        <span className="text-black font-bold">{(other || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Chat #{thread.id.slice(0,8)}</p>
                        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>Listing: {(thread.listing_id||'').slice(0,8)}</p>
                      </div>
                      <span className="text-xl" style={{ color: 'var(--color-gold)' }}>→</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
