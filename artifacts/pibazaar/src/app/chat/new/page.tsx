import { useState } from 'react'
import { useLocation, useSearch, Link } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useStartConversation, useUser } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'

export default function NewMessagePage() {
  const [, navigate] = useLocation()
  const search = useSearch()
  const params = new URLSearchParams(search)
  const recipientId = params.get('recipientId') ?? undefined
  const listingId = params.get('listingId') ?? undefined

  const { user, isAuthenticated } = useAuth()
  const { data: recipientData } = useUser(recipientId)
  const startConversation = useStartConversation()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recipientName = recipientData?.user?.username

  const handleSend = async () => {
    if (!recipientId || !content.trim()) return
    setError(null)
    try {
      const { conversationId } = await startConversation.mutateAsync({
        recipientId,
        listingId,
        content: content.trim(),
      })
      navigate(`/chat/${conversationId}`)
    } catch {
      setError('Could not start the conversation. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/chat')}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-heading text-2xl font-bold text-foreground">New Message</h1>
        </div>

        {!isAuthenticated || !user ? (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>Log in to send messages</EmptyTitle>
              <EmptyDescription>Sign in to start a conversation.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/login">
                <Button>Log in</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : recipientId && recipientId !== user.id ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a message to{' '}
              <span className="font-semibold text-foreground">
                @{recipientName ?? 'this user'}
              </span>
            </p>
            {error && (
              <div
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-error)' }}
              >
                {error}
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none bg-card text-foreground placeholder:text-muted-foreground border border-border"
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!content.trim() || startConversation.isPending}
              loading={startConversation.isPending}
            >
              Send message
            </Button>
          </div>
        ) : (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>Start from a listing</EmptyTitle>
              <EmptyDescription>
                Conversations begin from a listing’s “Message seller” button. Browse the
                marketplace and reach out to a seller to start chatting.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/browse">
                <Button>Browse listings</Button>
              </Link>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </main>
  )
}
