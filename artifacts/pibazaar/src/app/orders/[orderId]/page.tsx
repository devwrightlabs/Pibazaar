import { useParams, useLocation } from 'wouter'
import OrderTracker from '@/components/orders/OrderTracker'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [, navigate] = useLocation()

  return <OrderTracker escrowId={orderId} onBack={() => navigate('/orders')} />
}
