import { useParams, useLocation } from 'wouter'
import OrderTracker from '@/components/orders/OrderTracker'

/**
 * Escrow Transaction Detail Page
 *
 * Thin wrapper around the shared OrderTracker, which drives the full escrow
 * lifecycle (timeline + role-based actions) off the typed api-server client.
 */
export default function EscrowTransactionPage() {
  const { transactionId } = useParams<{ transactionId: string }>()
  const [, navigate] = useLocation()

  return <OrderTracker escrowId={transactionId} onBack={() => navigate('/orders')} />
}
