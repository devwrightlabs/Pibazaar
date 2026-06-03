import { useParams, useLocation } from 'wouter'
import { useAuth } from '@/components/providers/PiAuthProvider'
import { useConversations } from '@/lib/api/hooks'
import ChatInterface from '@/components/chat/ChatInterface'
import { Button } from '@/components/ui/button'

export default function ChatRoomPageV2() {
  const { chatId } = useParams<{ chatId: string }>()
  const [, navigate] = useLocation()
  const { user, isAuthenticated, isLoading } = useAuth()
  const { data } = useConversations()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Please log in to view this conversation.</p>
          <Button onClick={() => navigate('/login')}>Log in</Button>
        </div>
      </main>
    )
  }

  const conversation = data?.conversations.find((c) => c.id === chatId)
  const otherUserName = conversation?.otherUser?.username

  return (
    <ChatInterface
      conversationId={chatId}
      otherUserName={otherUserName}
      onBack={() => navigate('/messages')}
    />
  )
}
