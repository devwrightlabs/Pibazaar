import { env } from "./env";

const PI_API_BASE = "https://api.minepi.com/v2";

export interface PiMeResponse {
  uid: string;
  username: string;
}

export class PiApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PiApiError";
    this.status = status;
  }
}

/**
 * Verify a Pi access token server-to-server. Returns the authoritative Pi
 * identity. Only requires the user's access token (no API key).
 */
export async function verifyPiToken(accessToken: string): Promise<PiMeResponse> {
  const res = await fetch(`${PI_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new PiApiError("Failed to verify Pi access token", 401);
  }
  const data = (await res.json()) as PiMeResponse;
  if (!data?.uid) {
    throw new PiApiError("Invalid Pi API response: missing uid", 502);
  }
  return data;
}

function requirePiApiKey(): string {
  const key = env.PI_API_KEY;
  if (!key) {
    throw new PiApiError(
      "Pi payments are not configured (missing PI_API_KEY)",
      503,
    );
  }
  return key;
}

/** Approve a pending Pi payment (server-to-server). */
export async function approvePiPayment(paymentId: string): Promise<void> {
  const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
    method: "POST",
    headers: { Authorization: `Key ${requirePiApiKey()}` },
  });
  if (!res.ok) {
    throw new PiApiError(`Failed to approve Pi payment (${res.status})`, 502);
  }
}

/** Complete a Pi payment with its on-chain txid (server-to-server). */
export async function completePiPayment(
  paymentId: string,
  txid: string,
): Promise<void> {
  const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Key ${requirePiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txid }),
  });
  if (!res.ok) {
    throw new PiApiError(`Failed to complete Pi payment (${res.status})`, 502);
  }
}

/** Fetch payment details from Pi (used to validate amount/metadata). */
export async function getPiPayment(
  paymentId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${PI_API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: `Key ${requirePiApiKey()}` },
  });
  if (!res.ok) {
    throw new PiApiError(`Failed to fetch Pi payment (${res.status})`, 502);
  }
  return (await res.json()) as Record<string, unknown>;
}
