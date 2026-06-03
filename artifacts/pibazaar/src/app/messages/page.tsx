import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import { ConversationList } from '@/app/chat/page'

export default function MessagesPage() {
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
