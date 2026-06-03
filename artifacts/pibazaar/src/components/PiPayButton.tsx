import { useState } from 'react'
import { createPiPayment } from '@/lib/pi-sdk'
import { escrowApi, ApiError } from '@/lib/api/client'
import { useStore } from '@/store/useStore'

interface PiPayButtonProps {
  /** Escrow record this payment funds. Bound into approve/complete + metadata. */
  escrowId: string
  /** Amount in Pi to charge — should equal escrow.amountPi. */
  amount: number
  /** Short memo shown in the Pi wallet. */
  memo: string
  /** Extra metadata forwarded to the Pi SDK (escrowId is merged in). */
  metadata?: Record<string, unknown>
  /** Fired after the payment completes and the escrow is funded. */
  onComplete?: (paymentId: string, txid: string) => void
  /** Fired when the user cancels the payment. */
  onCancel?: (paymentId: string) => void
  disabled?: boolean
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export default function PiPayButton({
  escrowId,
  amount,
  memo,
  metadata,
  onComplete,
  onCancel,
  disabled = false,
}: PiPayButtonProps) {
  const [processing, setProcessing] = useState(false)
  const { openModal } = useStore()

  const handlePay = () => {
    if (processing || disabled) return
    setProcessing(true)

    createPiPayment(
      { amount, memo, metadata: { ...(metadata ?? {}), escrowId } },
      {
        onReadyForServerApproval: (paymentId) => {
          // Bind the Pi paymentId to the escrow and developer-approve server-side.
          void escrowApi.approve(escrowId, paymentId).catch((err: unknown) => {
            setProcessing(false)
            openModal({
              title: 'Approval Error',
              message: errorMessage(err, 'The server could not approve this payment. Please try again.'),
              variant: 'alert',
            })
          })
        },
        onReadyForServerCompletion: (paymentId, txid) => {
          // Complete the payment + transition the escrow to funded.
          void escrowApi
            .complete(escrowId, paymentId, txid)
            .then(() => {
              setProcessing(false)
              onComplete?.(paymentId, txid)
            })
            .catch((err: unknown) => {
              setProcessing(false)
              openModal({
                title: 'Verification Failed',
                message: errorMessage(err, 'Payment completed but verification failed. Please contact support.'),
                variant: 'alert',
              })
            })
        },
        onCancel: (paymentId) => {
          setProcessing(false)
          onCancel?.(paymentId)
        },
        onError: (error) => {
          setProcessing(false)
          openModal({
            title: 'Payment Failed',
            message: error.message || 'An error occurred while processing your Pi payment. Please try again.',
            variant: 'alert',
          })
        },
      },
    )
  }

  return (
    <button
      onClick={handlePay}
      disabled={processing || disabled}
      className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-opacity"
      style={{
        backgroundColor: 'var(--color-gold)',
        color: '#000',
        fontFamily: 'Sora, sans-serif',
        opacity: processing || disabled ? 0.7 : 1,
      }}
    >
      {processing ? (
        <>
          <span className="inline-block w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
          Processing…
        </>
      ) : (
        <>Pay {amount.toFixed(2)} π</>
      )}
    </button>
  )
}
