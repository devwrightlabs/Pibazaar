import { Router, type IRouter } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  escrowTransactions,
  listings,
  users,
  platformRevenue,
  type EscrowTransaction,
  type EscrowMilestone,
} from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import { serializeEscrow } from "../lib/serialize";
import {
  approvePiPayment,
  completePiPayment,
  getPiPayment,
  PiApiError,
} from "../lib/pi";
import { notify } from "../lib/notify";

const router: IRouter = Router();

const PLATFORM_FEE_RATE = 0.02; // 2%
const SHIP_AUTO_RELEASE_DAYS = 7;
const DELIVERED_AUTO_RELEASE_DAYS = 3;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function feeFor(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_RATE * 10000) / 10000;
}

async function loadParticipantEscrow(
  id: string,
  userId: string,
): Promise<EscrowTransaction> {
  const [row] = await db
    .select()
    .from(escrowTransactions)
    .where(eq(escrowTransactions.id, id))
    .limit(1);
  if (!row) throw new HttpError(404, "Escrow not found");
  if (row.buyerId !== userId && row.sellerId !== userId) {
    throw new HttpError(403, "You are not part of this escrow");
  }
  return row;
}

/** States from which an escrow can still be released to the seller. */
const RELEASABLE_STATES = ["funded", "shipped", "delivered"] as const;

/**
 * Release escrow funds (records revenue, credits the seller). When `complete`
 * is true the escrow is marked completed; otherwise released.
 */

async function releaseEscrow(
  escrow: EscrowTransaction,
  opts: { auto?: boolean; complete?: boolean } = {},
): Promise<EscrowTransaction> {
  const amount = Number(escrow.amountPi);
  const fee = feeFor(amount);

  return db.transaction(async (tx) => {
    // Guard against double-release races: only transition from a releasable
    // state. If a concurrent call already released it, no row is updated and we
    // bail out before recording revenue twice.
    const [updated] = await tx
      .update(escrowTransactions)
      .set({
        status: opts.complete ? "completed" : opts.auto ? "auto_released" : "released",
        platformFeePi: String(fee),
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(escrowTransactions.id, escrow.id),
          inArray(escrowTransactions.status, [...RELEASABLE_STATES]),
        ),
      )
      .returning();

    if (!updated) {
      throw new HttpError(409, "Escrow has already been finalised");
    }

    await tx.insert(platformRevenue).values({
      escrowId: escrow.id,
      amountPi: String(fee),
    });

    await tx
      .update(users)
      .set({ totalSales: sql`${users.totalSales} + 1`, updatedAt: new Date() })
      .where(eq(users.id, escrow.sellerId));

    return updated;
  });
}

/**
 * Validate that a Pi payment actually corresponds to this escrow before we
 * approve/complete it. The client must create the Pi payment with
 * `amount` = escrow amount and `metadata.escrowId` = escrow id.
 */
async function loadAndVerifyPayment(
  paymentId: string,
  escrow: EscrowTransaction,
): Promise<void> {
  let payment: Record<string, unknown>;
  try {
    payment = await getPiPayment(paymentId);
  } catch (err) {
    if (err instanceof PiApiError) throw new HttpError(err.status, err.message);
    throw err;
  }

  const amount = Number(payment.amount);
  if (
    !Number.isFinite(amount) ||
    Math.abs(amount - Number(escrow.amountPi)) > 0.0000001
  ) {
    throw new HttpError(400, "Payment amount does not match the escrow");
  }

  const meta = payment.metadata;
  const boundEscrowId =
    meta && typeof meta === "object"
      ? (meta as Record<string, unknown>).escrowId
      : undefined;
  if (boundEscrowId !== escrow.id) {
    throw new HttpError(400, "Payment is not bound to this escrow");
  }
}

// ─── List my escrows ──────────────────────────────────────────────────────────

router.get(
  "/escrow",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const role = req.query.role; // 'buyer' | 'seller' | undefined (both)
    const whereClause =
      role === "buyer"
        ? eq(escrowTransactions.buyerId, uid)
        : role === "seller"
          ? eq(escrowTransactions.sellerId, uid)
          : or(
              eq(escrowTransactions.buyerId, uid),
              eq(escrowTransactions.sellerId, uid),
            );

    const rows = await db
      .select()
      .from(escrowTransactions)
      .where(whereClause)
      .orderBy(desc(escrowTransactions.createdAt));
    res.json({ escrows: rows.map(serializeEscrow) });
  }),
);

router.get(
  "/escrow/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    res.json({ escrow: serializeEscrow(escrow) });
  }),
);

// ─── Create escrow (buyer initiates a purchase) ───────────────────────────────

const createSchema = z.object({
  listingId: z.string().uuid(),
  releaseType: z.enum(["shipping", "local_meetup", "digital"]).optional(),
  shippingAddressId: z.string().uuid().nullable().optional(),
  shippingMethod: z.string().max(120).optional(),
  milestones: z
    .array(z.object({ title: z.string().min(1).max(140), amountPi: z.number().positive() }))
    .max(20)
    .optional(),
});

router.post(
  "/escrow",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { listingId, shippingAddressId, shippingMethod } = parsed.data;
    const uid = req.user!.id;

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!listing || listing.status !== "active") {
      throw new HttpError(404, "Listing is not available");
    }
    if (listing.sellerId === uid) {
      throw new HttpError(400, "You cannot buy your own listing");
    }

    const releaseType =
      parsed.data.releaseType ??
      (listing.productType === "digital" ? "digital" : "shipping");

    const amount = Number(listing.priceInPi);

    let milestones: EscrowMilestone[] | null = null;
    if (releaseType === "digital" && parsed.data.milestones?.length) {
      const sum = parsed.data.milestones.reduce((a, m) => a + m.amountPi, 0);
      if (Math.abs(sum - amount) > 0.0001) {
        throw new HttpError(400, "Milestone amounts must sum to the listing price");
      }
      milestones = parsed.data.milestones.map((m) => ({
        id: randomUUID(),
        title: m.title,
        amountPi: m.amountPi,
        status: "pending" as const,
      }));
    }

    const meetupCode =
      releaseType === "local_meetup" ? randomBytes(8).toString("hex") : null;

    const [escrow] = await db
      .insert(escrowTransactions)
      .values({
        listingId,
        buyerId: uid,
        sellerId: listing.sellerId,
        amountPi: String(amount),
        platformFeePi: String(feeFor(amount)),
        status: "pending",
        releaseType,
        shippingAddressId: shippingAddressId ?? null,
        shippingMethod: shippingMethod ?? null,
        shippingCarrier: listing.shippingCarrier ?? null,
        meetupCode,
        milestones,
      })
      .returning();

    await notify(listing.sellerId, {
      type: "escrow",
      title: "New order",
      body: `${req.user!.username} started a purchase of "${listing.title}"`,
      metadata: { escrowId: escrow.id, listingId },
    });

    res.status(201).json({ escrow: serializeEscrow(escrow) });
  }),
);

// ─── Pi payment: approve then complete (buyer) ────────────────────────────────

router.post(
  "/escrow/:id/approve",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.buyerId !== req.user!.id)
      throw new HttpError(403, "Only the buyer can pay");
    if (escrow.status !== "pending")
      throw new HttpError(409, "Escrow is not awaiting payment");

    const paymentId = z.string().min(1).parse(req.body?.paymentId);
    await loadAndVerifyPayment(paymentId, escrow);
    try {
      await approvePiPayment(paymentId);
    } catch (err) {
      if (err instanceof PiApiError) throw new HttpError(err.status, err.message);
      throw err;
    }

    const [updated] = await db
      .update(escrowTransactions)
      .set({ piPaymentId: paymentId, updatedAt: new Date() })
      .where(
        and(
          eq(escrowTransactions.id, escrow.id),
          eq(escrowTransactions.status, "pending"),
        ),
      )
      .returning();
    if (!updated)
      throw new HttpError(409, "Escrow is no longer awaiting payment");
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

router.post(
  "/escrow/:id/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.buyerId !== req.user!.id)
      throw new HttpError(403, "Only the buyer can pay");
    if (escrow.status !== "pending")
      throw new HttpError(409, "Escrow is not awaiting payment");

    const body = z
      .object({ paymentId: z.string().min(1), txid: z.string().min(1) })
      .parse(req.body);
    await loadAndVerifyPayment(body.paymentId, escrow);
    try {
      await completePiPayment(body.paymentId, body.txid);
    } catch (err) {
      if (err instanceof PiApiError) throw new HttpError(err.status, err.message);
      throw err;
    }

    const [updated] = await db
      .update(escrowTransactions)
      .set({
        status: "funded",
        piPaymentId: body.paymentId,
        piTxid: body.txid,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(escrowTransactions.id, escrow.id),
          eq(escrowTransactions.status, "pending"),
        ),
      )
      .returning();
    if (!updated)
      throw new HttpError(409, "Escrow is no longer awaiting payment");

    await notify(escrow.sellerId, {
      type: "escrow",
      title: "Payment received",
      body: "Escrow funded — you can now fulfil the order.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

// ─── Shipping fulfilment (seller) ─────────────────────────────────────────────

router.post(
  "/escrow/:id/ship",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.sellerId !== req.user!.id)
      throw new HttpError(403, "Only the seller can ship");
    if (escrow.status !== "funded")
      throw new HttpError(409, "Escrow must be funded before shipping");

    const body = z
      .object({
        trackingNumber: z.string().max(120).optional(),
        shippingCarrier: z.string().max(120).optional(),
      })
      .parse(req.body ?? {});

    const [updated] = await db
      .update(escrowTransactions)
      .set({
        status: "shipped",
        trackingNumber: body.trackingNumber ?? escrow.trackingNumber,
        shippingCarrier: body.shippingCarrier ?? escrow.shippingCarrier,
        autoReleaseAt: daysFromNow(SHIP_AUTO_RELEASE_DAYS),
        updatedAt: new Date(),
      })
      .where(eq(escrowTransactions.id, escrow.id))
      .returning();

    await notify(escrow.buyerId, {
      type: "escrow",
      title: "Order shipped",
      body: "Your order is on the way.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

router.post(
  "/escrow/:id/deliver",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.sellerId !== req.user!.id)
      throw new HttpError(403, "Only the seller can mark delivery");
    if (escrow.status !== "shipped")
      throw new HttpError(409, "Escrow must be shipped first");

    const [updated] = await db
      .update(escrowTransactions)
      .set({
        status: "delivered",
        autoReleaseAt: daysFromNow(DELIVERED_AUTO_RELEASE_DAYS),
        updatedAt: new Date(),
      })
      .where(eq(escrowTransactions.id, escrow.id))
      .returning();

    await notify(escrow.buyerId, {
      type: "escrow",
      title: "Order delivered",
      body: "Please confirm receipt to release the funds.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

// ─── Buyer confirms receipt → release (shipping & digital w/o milestones) ─────

router.post(
  "/escrow/:id/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.buyerId !== req.user!.id)
      throw new HttpError(403, "Only the buyer can confirm receipt");
    if (!["funded", "shipped", "delivered"].includes(escrow.status)) {
      throw new HttpError(409, "Escrow cannot be released from its current state");
    }

    const updated = await releaseEscrow(escrow);
    await notify(escrow.sellerId, {
      type: "escrow",
      title: "Funds released",
      body: "The buyer confirmed receipt and funds were released.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

// ─── Local meetup QR release (seller submits the buyer's code) ─────────────────

router.get(
  "/escrow/:id/meetup-code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.buyerId !== req.user!.id)
      throw new HttpError(403, "Only the buyer can view the release code");
    if (escrow.releaseType !== "local_meetup")
      throw new HttpError(400, "This escrow is not a local meetup");
    res.json({ code: escrow.meetupCode, escrowId: escrow.id });
  }),
);

router.post(
  "/escrow/:id/meetup/release",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.sellerId !== req.user!.id)
      throw new HttpError(403, "Only the seller scans the buyer's code");
    if (escrow.releaseType !== "local_meetup")
      throw new HttpError(400, "This escrow is not a local meetup");
    if (escrow.status !== "funded")
      throw new HttpError(409, "Escrow must be funded");

    const code = z.string().min(1).parse(req.body?.code);
    if (!escrow.meetupCode || code !== escrow.meetupCode) {
      throw new HttpError(400, "Invalid meetup code");
    }

    const updated = await releaseEscrow(escrow, { complete: true });
    await notify(escrow.buyerId, {
      type: "escrow",
      title: "Meetup complete",
      body: "The handover was confirmed and funds released.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

// ─── Digital milestone release (buyer) ────────────────────────────────────────

router.post(
  "/escrow/:id/milestones/:milestoneId/release",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Authorize against the loaded row, then perform the mutation atomically
    // inside a transaction that re-reads the row under a lock so concurrent
    // milestone releases can't double-count revenue or seller sales.
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.buyerId !== req.user!.id)
      throw new HttpError(403, "Only the buyer can release milestones");
    if (escrow.releaseType !== "digital" || !escrow.milestones?.length)
      throw new HttpError(400, "This escrow has no milestones");

    const milestoneId = param(req, "milestoneId");

    const { updated, target } = await db.transaction(async (tx) => {
      const [fresh] = await tx
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.id, escrow.id))
        .for("update");
      if (!fresh) throw new HttpError(404, "Escrow not found");
      if (!["funded", "delivered"].includes(fresh.status))
        throw new HttpError(409, "Escrow must be funded");
      if (!fresh.milestones?.length)
        throw new HttpError(400, "This escrow has no milestones");

      const current = fresh.milestones.find((m) => m.id === milestoneId);
      if (!current) throw new HttpError(404, "Milestone not found");
      if (current.status === "released")
        throw new HttpError(409, "Milestone already released");

      const milestones = fresh.milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, status: "released" as const, releasedAt: new Date().toISOString() }
          : m,
      );
      const releasedMs = milestones.find((m) => m.id === milestoneId)!;
      const allReleased = milestones.every((m) => m.status === "released");
      const released = milestones.filter((m) => m.status === "released");
      const feePortion = feeFor(released.reduce((a, m) => a + m.amountPi, 0));

      const [row] = await tx
        .update(escrowTransactions)
        .set({
          milestones,
          status: allReleased ? "completed" : fresh.status,
          platformFeePi: String(feePortion),
          releasedAt: allReleased ? new Date() : fresh.releasedAt,
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, escrow.id))
        .returning();

      if (allReleased) {
        await tx
          .update(users)
          .set({ totalSales: sql`${users.totalSales} + 1`, updatedAt: new Date() })
          .where(eq(users.id, escrow.sellerId));
        await tx.insert(platformRevenue).values({
          escrowId: escrow.id,
          amountPi: String(feePortion),
        });
      }

      return { updated: row, target: releasedMs };
    });

    await notify(escrow.sellerId, {
      type: "escrow",
      title: "Milestone released",
      body: `Milestone "${target.title}" was released.`,
      metadata: { escrowId: escrow.id, milestoneId: target.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

// ─── Dispute / cancel ─────────────────────────────────────────────────────────

router.post(
  "/escrow/:id/dispute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (["released", "completed", "auto_released", "cancelled"].includes(escrow.status))
      throw new HttpError(409, "Escrow is already finalised");

    const reason = z.string().min(1).max(1000).parse(req.body?.reason);
    const [updated] = await db
      .update(escrowTransactions)
      .set({ status: "disputed", disputeReason: reason, updatedAt: new Date() })
      .where(eq(escrowTransactions.id, escrow.id))
      .returning();

    const other =
      escrow.buyerId === req.user!.id ? escrow.sellerId : escrow.buyerId;
    await notify(other, {
      type: "escrow",
      title: "Order disputed",
      body: "A dispute was opened on an order.",
      metadata: { escrowId: escrow.id },
    });
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

router.post(
  "/escrow/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await loadParticipantEscrow(param(req, "id"), req.user!.id);
    if (escrow.status !== "pending")
      throw new HttpError(409, "Only unfunded escrows can be cancelled");

    const [updated] = await db
      .update(escrowTransactions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(escrowTransactions.id, escrow.id))
      .returning();
    res.json({ escrow: serializeEscrow(updated) });
  }),
);

export default router;
