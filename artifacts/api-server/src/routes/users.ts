import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import {
  db,
  users,
  listings,
  reviews,
  escrowTransactions,
  conversations,
  messages,
  notifications,
} from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import {
  serializeSelf,
  serializePublicUser,
  serializeListing,
} from "../lib/serialize";

const router: IRouter = Router();

// ─── Current user profile ─────────────────────────────────────────────────────

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: serializeSelf(user) });
  }),
);

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/)
    .optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().max(1000).nullable().optional(),
  email: z.string().email().nullable().optional(),
  walletAddress: z.string().max(200).nullable().optional(),
  themePreference: z.enum(["dark", "light"]).optional(),
  jurisdictionMode: z.enum(["local", "global"]).optional(),
  country: z.string().max(100).nullable().optional(),
});

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const updates = parsed.data;

    if (updates.username && updates.username !== req.user!.username) {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.username, updates.username), ne(users.id, req.user!.id)),
        )
        .limit(1);
      if (taken) throw new HttpError(409, "Username is already taken");
    }

    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning();
    res.json({ user: serializeSelf(user) });
  }),
);

// ─── Own listings (including drafts) ──────────────────────────────────────────

router.get(
  "/me/listings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, req.user!.id),
          isNull(listings.deletedAt),
          statusFilter
            ? eq(listings.status, statusFilter as never)
            : undefined,
        ),
      )
      .orderBy(desc(listings.updatedAt));
    res.json({ listings: rows.map(serializeListing) });
  }),
);

// ─── Dashboard aggregates ─────────────────────────────────────────────────────

router.get(
  "/me/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;

    const [activeListings] = await db
      .select({ value: count() })
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, uid),
          eq(listings.status, "active"),
          isNull(listings.deletedAt),
        ),
      );

    const [draftListings] = await db
      .select({ value: count() })
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, uid),
          eq(listings.status, "draft"),
          isNull(listings.deletedAt),
        ),
      );

    const [salesCompleted] = await db
      .select({ value: count() })
      .from(escrowTransactions)
      .where(
        and(
          eq(escrowTransactions.sellerId, uid),
          sql`${escrowTransactions.status} in ('released','completed','auto_released')`,
        ),
      );

    const [purchases] = await db
      .select({ value: count() })
      .from(escrowTransactions)
      .where(eq(escrowTransactions.buyerId, uid));

    const [activeEscrows] = await db
      .select({ value: count() })
      .from(escrowTransactions)
      .where(
        and(
          sql`(${escrowTransactions.sellerId} = ${uid} or ${escrowTransactions.buyerId} = ${uid})`,
          sql`${escrowTransactions.status} in ('pending','funded','shipped','delivered','disputed')`,
        ),
      );

    const [revenue] = await db
      .select({
        total: sql<string>`coalesce(sum(${escrowTransactions.amountPi}), 0)`,
      })
      .from(escrowTransactions)
      .where(
        and(
          eq(escrowTransactions.sellerId, uid),
          sql`${escrowTransactions.status} in ('released','completed','auto_released')`,
        ),
      );

    const [unreadNotifications] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, uid), eq(notifications.isRead, false)),
      );

    const [unreadMessages] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(
        conversations,
        eq(messages.conversationId, conversations.id),
      )
      .where(
        and(
          eq(messages.isRead, false),
          ne(messages.senderId, uid),
          sql`(${conversations.participantA} = ${uid} or ${conversations.participantB} = ${uid})`,
        ),
      );

    res.json({
      activeListings: activeListings.value,
      draftListings: draftListings.value,
      sales: salesCompleted.value,
      purchases: purchases.value,
      activeEscrows: activeEscrows.value,
      revenuePi: Number(revenue.total),
      unreadNotifications: unreadNotifications.value,
      unreadMessages: unreadMessages.value,
    });
  }),
);

// ─── Public profiles ──────────────────────────────────────────────────────────

router.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, param(req, "id")))
      .limit(1);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: serializePublicUser(user) });
  }),
);

router.get(
  "/users/:id/listings",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.sellerId, param(req, "id")),
          eq(listings.status, "active"),
          isNull(listings.deletedAt),
        ),
      )
      .orderBy(desc(listings.createdAt));
    res.json({ listings: rows.map(serializeListing) });
  }),
);

router.get(
  "/users/:id/reviews",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerId: reviews.reviewerId,
        reviewerUsername: users.username,
        reviewerAvatarUrl: users.avatarUrl,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.revieweeId, param(req, "id")))
      .orderBy(desc(reviews.createdAt));
    res.json({ reviews: rows });
  }),
);

export default router;
