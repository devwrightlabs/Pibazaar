/**
 * UserSearch
 *
 * The API contract exposes no public user-search endpoint, so free-text user
 * lookup is intentionally unavailable. Conversations are started from a
 * listing's "Message seller" button instead. This component renders an
 * explanatory, disabled state to make that flow discoverable.
 */

import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'

interface Props {
  /** Retained for backwards compatibility; unused. */
  onSelectUser?: () => void
  excludeUserId?: string
}

export default function UserSearch(_props: Props) {
  return (
    <Empty className="border border-border">
      <EmptyHeader>
        <EmptyTitle>Search isn’t available</EmptyTitle>
        <EmptyDescription>
          Start a conversation from a listing’s “Message seller” button.
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
