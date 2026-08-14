/**
 * Favorites / Wishlist routes
 *
 * Security model: every query is hard-scoped to req.user.id (set by
 * requireAuth). A user can only read or modify their OWN favorites —
 * there is no way to query another user's favorites through this API.
 *
 * POST /favorites/:listingId  — toggle: add if absent, remove if present
 * GET  /favorites             — list caller's favorited listings (full Listing objects)
 */

import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, favorites, listings } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import { serializeListing } from "../lib/serialize";

const router: IRouter = Router();

// ─── Toggle favorite ──────────────────────────────────────────────────────────

router.post(
  "/favorites/:listingId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listingId = param(req, "listingId");
    const userId = req.user!.id;

    // Verify the listing exists and is not deleted.
    const [listing] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) throw new HttpError(404, "Listing not found");

    // Check if already favorited (scoped to this user only).
    const [existing] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.listingId, listingId),
        ),
      )
      .limit(1);

    if (existing) {
      // Already favorited → remove it.
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.listingId, listingId),
          ),
        );
      res.json({ favorited: false });
    } else {
      // Not yet favorited → add it.
      await db.insert(favorites).values({ userId, listingId });
      res.json({ favorited: true });
    }
  }),
);

// ─── List my favorites ────────────────────────────────────────────────────────

router.get(
  "/favorites",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Join favorites → listings; only return rows where the listing still exists.
    // Server-side scoping: WHERE favorites.user_id = :userId (never a param).
    const rows = await db
      .select()
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .where(eq(favorites.userId, userId))
      .orderBy(favorites.createdAt);

    res.json({
      favorites: rows.map((r) => ({
        id: r.favorites.id,
        listingId: r.favorites.listingId,
        createdAt: r.favorites.createdAt,
        listing: serializeListing(r.listings),
      })),
    });
  }),
);

export default router;
