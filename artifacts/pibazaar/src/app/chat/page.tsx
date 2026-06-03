import { Link } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useConversations } from '@/lib/api/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'
import type { Conversation } from '@/lib/api/types'

function ConversationRow({ conversation }: { conversation: Conversation }) {
  // The list endpoint enriches each conversation with the other participant.
  const other = conversation.otherUser
  const name = other?.username ?? 'User'

  return (
    <Link href={`/chat/${conversation.id}`}>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:opacity-90 transition-opacity cursor-pointer">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-primary text-primary-foreground">
          {other?.avatarUrl ? (
            <img src={other.avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate text-foreground">@{name}</p>
            {conversation.lastMessageAt && (
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {new Date(conversation.lastMessageAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs truncate text-muted-foreground">
            {conversation.lastMessage || 'No messages yet'}
          </p>
        </div>
        {!!conversation.unread && (
          <span className="flex-shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 bg-primary text-primary-foreground">
            {conversation.unread}
          </span>
        )}
      </div>
    </Link>
  )
}

/** Reusable conversation list — rendered by both /chat and /messages. */
export function ConversationList() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { data, isLoading, isError, refetch } = useConversations()

  if (authLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>Log in to view messages</EmptyTitle>
          <EmptyDescription>Sign in to start and read conversations.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/login">
            <Button>Log in</Button>
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>We couldn’t load your conversations.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => void refetch()}>Try again</Button>
        </EmptyContent>
      </Empty>
    )
  }

  const conversations = data?.conversations ?? []

  if (conversations.length === 0) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>
            Start chatting from a listing’s “Message seller” button.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/browse">
            <Button>Browse listings</Button>
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <ConversationRow key={conv.id} conversation={conv} />
      ))}
    </div>
  )
}

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Messages</h1>
          <Link href="/chat/new">
            <Button size="icon" aria-label="New message" className="rounded-full">
              +
            </Button>
          </Link>
        </div>
        <ConversationList />
      </div>
    </main>
  )
}
