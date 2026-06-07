import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, listings } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import { approvePiPayment, completePiPayment, getPiPayment } from "../lib/pi";

const router: IRouter = Router();

const LISTING_FEE_PI = 0.5;

// ─── Approve listing-fee payment (onReadyForServerApproval) ───────────────────
//
// The Pi SDK calls this immediately after the user confirms payment.
// We validate the amount and metadata, then call Pi's /approve endpoint.
// The listing stays in `draft` until completion.

router.post(
  "/payments/listing-fee/approve",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        paymentId: z.string().min(1),
        listingId: z.string().uuid(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { paymentId, listingId } = parsed.data;

    // Verify the listing belongs to this user and is still a draft.
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.sellerId, req.user!.id)))
      .limit(1);

    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }

    // Fetch payment details from Pi to validate amount + metadata.
    const piPayment = await getPiPayment(paymentId);
    const amount = Number(piPayment.amount);
    if (Math.abs(amount - LISTING_FEE_PI) > 0.0001) {
      throw new HttpError(400, `Expected listing fee of ${LISTING_FEE_PI}π, got ${amount}π`);
    }

    const meta = piPayment.metadata as Record<string, unknown> | null;
    if (!meta || meta.listingId !== listingId || meta.type !== "listing_fee") {
      throw new HttpError(400, "Payment metadata does not match listing");
    }

    await approvePiPayment(paymentId);

    res.json({ ok: true });
  }),
);

// ─── Complete listing-fee payment (onReadyForServerCompletion) ────────────────
//
// Called after the Pi blockchain confirms the transaction.
// We complete the payment on Pi's side, then activate the listing.

router.post(
  "/payments/listing-fee/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        paymentId: z.string().min(1),
        txid: z.string().min(1),
        listingId: z.string().uuid(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { paymentId, txid, listingId } = parsed.data;

    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.sellerId, req.user!.id)))
      .limit(1);

    if (!listing) {
      throw new HttpError(404, "Listing not found");
    }

    await completePiPayment(paymentId, txid);

    const [updated] = await db
      .update(listings)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(listings.id, listingId))
      .returning();

    res.json({ ok: true, listing: updated });
  }),
);

// ─── Complete an incomplete (in-flight) listing-fee payment ───────────────────
//
// Called from onIncompletePaymentFound on the client. Drives the payment
// to completion server-side so it is never silently abandoned.

router.post(
  "/payments/listing-fee/complete-incomplete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({ paymentId: z.string().min(1) })
      .safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { paymentId } = parsed.data;

    // Fetch payment from Pi to get current state and metadata.
    const piPayment = await getPiPayment(paymentId);
    const meta = piPayment.metadata as Record<string, unknown> | null;
    const listingId = typeof meta?.listingId === "string" ? meta.listingId : null;

    const status = piPayment.status as {
      developer_approved?: boolean;
      developer_completed?: boolean;
      transaction_verified?: boolean;
    };

    if (!status.developer_approved) {
      await approvePiPayment(paymentId);
    }

    const txObj = piPayment.transaction as { txid?: string } | null;
    if (status.transaction_verified && txObj?.txid && !status.developer_completed) {
      await completePiPayment(paymentId, txObj.txid);

      if (listingId) {
        const [listing] = await db
          .select()
          .from(listings)
          .where(and(eq(listings.id, listingId), eq(listings.sellerId, req.user!.id)))
          .limit(1);

        if (listing && listing.status === "draft") {
          await db
            .update(listings)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(listings.id, listingId));
        }
      }
    }

    res.json({ ok: true });
  }),
);

export default router;
