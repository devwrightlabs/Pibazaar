/**
 * ChatInterface — conversation room UI backed by the Express API.
 *
 * History comes from React Query (`useMessages`), sending via `useSendMessage`.
 * Incoming messages are delivered globally by `useRealtimeSync` (mounted in the
 * auth provider), which appends to the `qk.messages(conversationId)` cache — so
 * this component just renders from the query cache and auto-scrolls.
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useMessages, useSendMessage } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

interface ChatInterfaceProps {
  /** conversations.id */
  conversationId: string
  /** Display name of the other participant. */
  otherUserName?: string
  /** Called when the user taps the back arrow. */
  onBack?: () => void
}

export default function ChatInterface({
  conversationId,
  otherUserName = 'Chat',
  onBack,
}: ChatInterfaceProps) {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId)
  const [text, setText] = useState('')

  const messages = data?.messages ?? []
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || sendMessage.isPending) return
    sendMessage.mutate(trimmed, {
      onSuccess: () => setText(''),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Please log in to view this conversation.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background min-w-[320px]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
          <span className="font-bold text-sm">{otherUserName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm truncate text-foreground">{otherUserName}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className="h-10 w-1/2 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <p className="text-sm text-muted-foreground">Could not load messages.</p>
            <Button size="sm" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold mb-1 text-foreground">Start the conversation</p>
            <p className="text-sm text-muted-foreground">Say hello to {otherUserName}!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.senderId === user.id
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                    <span className="block text-[10px] opacity-70 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 p-3 border-t border-border bg-card flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={sendMessage.isPending}
          className="flex-1 px-4 py-3 rounded-2xl text-sm resize-none outline-none bg-muted text-foreground placeholder:text-muted-foreground disabled:opacity-50 max-h-[120px]"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending}
          size="icon"
          aria-label="Send message"
          className="h-11 w-11 rounded-full"
        >
          {sendMessage.isPending ? (
            <Spinner className="text-primary-foreground" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  )
}
