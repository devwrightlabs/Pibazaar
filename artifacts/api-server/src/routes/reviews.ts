import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, reviews, escrowTransactions, users } from "@workspace/db";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import { notify } from "../lib/notify";

const router: IRouter = Router();

const reviewSchema = z.object({
  escrowId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.post(
  "/reviews",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { escrowId, rating, comment } = parsed.data;
    const uid = req.user!.id;

    const [escrow] = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, escrowId))
      .limit(1);
    if (!escrow) throw new HttpError(404, "Escrow not found");
    if (escrow.buyerId !== uid && escrow.sellerId !== uid)
      throw new HttpError(403, "You are not part of this transaction");
    if (!["released", "completed", "auto_released"].includes(escrow.status))
      throw new HttpError(409, "You can only review completed transactions");

    const revieweeId = escrow.buyerId === uid ? escrow.sellerId : escrow.buyerId;

    let review;
    try {
      [review] = await db
        .insert(reviews)
        .values({ reviewerId: uid, revieweeId, escrowId, rating, comment: comment ?? null })
        .returning();
    } catch {
      throw new HttpError(409, "You already reviewed this transaction");
    }

    // Recompute the reviewee's average rating into trust_score.
    const [agg] = await db
      .select({ avg: sql<string>`coalesce(avg(${reviews.rating}), 0)` })
      .from(reviews)
      .where(eq(reviews.revieweeId, revieweeId));
    await db
      .update(users)
      .set({ trustScore: String(Number(agg.avg).toFixed(2)), updatedAt: new Date() })
      .where(eq(users.id, revieweeId));

    await notify(revieweeId, {
      type: "review",
      title: "New review",
      body: `You received a ${rating}-star review.`,
      metadata: { escrowId, reviewId: review.id },
    });

    res.status(201).json({ review });
  }),
);

export default router;
