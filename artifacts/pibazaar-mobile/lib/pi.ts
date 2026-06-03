/**
 * Pi SDK payment wrapper — PiBazaar Mobile
 *
 * window.Pi is only present inside the Pi Browser (web). React Native cannot
 * call it directly, so callers should check isPiAvailable() first and degrade
 * gracefully with a "Pi Browser required" message.
 *
 * Funding flow (mirrors the web app):
 *   createPiPayment({ amount, memo, metadata: { escrowId } }, callbacks)
 *     onReadyForServerApproval(paymentId)   -> escrowApi.approve(id, paymentId)
 *     onReadyForServerCompletion(paymentId, txid) -> escrowApi.complete(id, paymentId, txid)
 */

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error) => void;
}

type PiSdk = {
  createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
};

function getPiSdk(): PiSdk | null {
  if (typeof globalThis === "undefined") return null;
  const w = globalThis as unknown as { Pi?: PiSdk };
  return w.Pi ?? null;
}

/** True only inside the Pi Browser where window.Pi.createPayment exists. */
export function isPiAvailable(): boolean {
  return getPiSdk() != null;
}

export function createPiPayment(
  data: PiPaymentData,
  callbacks: PiPaymentCallbacks
): void {
  const pi = getPiSdk();
  if (!pi) {
    callbacks.onError(new Error("Pi SDK not available"));
    return;
  }
  try {
    pi.createPayment(data, callbacks);
  } catch (err) {
    callbacks.onError(
      err instanceof Error ? err : new Error("Pi payment creation failed")
    );
  }
}
