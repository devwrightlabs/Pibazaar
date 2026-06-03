import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db, listings, users } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { serializeListing, serializePublicUser } from "../lib/serialize";

const router: IRouter = Router();

// ─── Search / browse (public, active listings only) ───────────────────────────

router.get(
  "/listings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const condition =
      typeof req.query.condition === "string" ? req.query.condition : undefined;
    const productType =
      typeof req.query.productType === "string"
        ? req.query.productType
        : undefined;
    const country =
      typeof req.query.country === "string" ? req.query.country : undefined;
    const sellerId =
      typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const sort = typeof req.query.sort === "string" ? req.query.sort : "recent";
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const filters = [
      eq(listings.status, "active"),
      isNull(listings.deletedAt),
    ];
    if (q) {
      filters.push(
        or(
          ilike(listings.title, `%${q}%`),
          ilike(listings.description, `%${q}%`),
        )!,
      );
    }
    if (category) filters.push(eq(listings.category, category));
    if (condition) filters.push(eq(listings.condition, condition as never));
    if (productType)
      filters.push(eq(listings.productType, productType as never));
    if (country) filters.push(eq(listings.country, country));
    if (sellerId) filters.push(eq(listings.sellerId, sellerId));
    if (minPrice !== undefined && !Number.isNaN(minPrice))
      filters.push(gte(listings.priceInPi, String(minPrice)));
    if (maxPrice !== undefined && !Number.isNaN(maxPrice))
      filters.push(lte(listings.priceInPi, String(maxPrice)));

    const orderBy =
      sort === "price_asc"
        ? [asc(listings.priceInPi)]
        : sort === "price_desc"
          ? [desc(listings.priceInPi)]
          : [desc(listings.isBoosted), desc(listings.createdAt)];

    const rows = await db
      .select()
      .from(listings)
      .where(and(...filters))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const [{ value: total }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(listings)
      .where(and(...filters));

    res.json({
      listings: rows.map(serializeListing),
      total,
      limit,
      offset,
    });
  }),
);

// ─── Detail (public) ──────────────────────────────────────────────────────────

router.get(
  "/listings/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const [row] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, param(req, "id")), isNull(listings.deletedAt)))
      .limit(1);
    if (!row) throw new HttpError(404, "Listing not found");

    // Drafts are only visible to their owner.
    if (row.status === "draft" && row.sellerId !== req.user?.id) {
      throw new HttpError(404, "Listing not found");
    }

    const [seller] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.sellerId))
      .limit(1);

    res.json({
      listing: serializeListing(row),
      seller: seller ? serializePublicUser(seller) : null,
    });
  }),
);

// ─── Create (supports draft autosave) ─────────────────────────────────────────

const listingBodySchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(5000).optional().default(""),
  priceInPi: z.number().nonnegative(),
  category: z.string().min(1).max(80),
  condition: z.enum(["new", "like_new", "good", "fair"]).optional(),
  productType: z.enum(["physical", "digital", "service"]).optional(),
  status: z.enum(["draft", "active", "scheduled"]).optional(),
  images: z.array(z.string().max(1000)).max(20).optional(),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  originCountry: z.string().max(120).nullable().optional(),
  allowOffers: z.boolean().optional(),
  shippingCarrier: z.string().max(120).nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

// Drafts may be incomplete, so most fields are relaxed when status === "draft".
const draftBodySchema = listingBodySchema.partial().extend({
  status: z.literal("draft"),
});

router.post(
  "/listings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isDraft = req.body?.status === "draft";
    const parsed = isDraft
      ? draftBodySchema.safeParse(req.body)
      : listingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const data = parsed.data;

    const [row] = await db
      .insert(listings)
      .values({
        sellerId: req.user!.id,
        title: data.title ?? "Untitled draft",
        description: data.description ?? "",
        priceInPi: String(data.priceInPi ?? 0),
        category: data.category ?? "uncategorized",
        condition: data.condition,
        productType: data.productType,
        status: data.status ?? "active",
        images: data.images ?? [],
        locationLat: data.locationLat ?? null,
        locationLng: data.locationLng ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        originCountry: data.originCountry ?? null,
        allowOffers: data.allowOffers,
        shippingCarrier: data.shippingCarrier ?? null,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      })
      .returning();

    res.status(201).json({ listing: serializeListing(row) });
  }),
);

// ─── Update (owner only; used for draft autosave + edits) ─────────────────────

router.patch(
  "/listings/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, param(req, "id")), isNull(listings.deletedAt)))
      .limit(1);
    if (!existing) throw new HttpError(404, "Listing not found");
    if (existing.sellerId !== req.user!.id) {
      throw new HttpError(403, "You do not own this listing");
    }

    const parsed = listingBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const d = parsed.data;

    const [row] = await db
      .update(listings)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.priceInPi !== undefined ? { priceInPi: String(d.priceInPi) } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.condition !== undefined ? { condition: d.condition } : {}),
        ...(d.productType !== undefined ? { productType: d.productType } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.images !== undefined ? { images: d.images } : {}),
        ...(d.locationLat !== undefined ? { locationLat: d.locationLat } : {}),
        ...(d.locationLng !== undefined ? { locationLng: d.locationLng } : {}),
        ...(d.city !== undefined ? { city: d.city } : {}),
        ...(d.country !== undefined ? { country: d.country } : {}),
        ...(d.originCountry !== undefined
          ? { originCountry: d.originCountry }
          : {}),
        ...(d.allowOffers !== undefined ? { allowOffers: d.allowOffers } : {}),
        ...(d.shippingCarrier !== undefined
          ? { shippingCarrier: d.shippingCarrier }
          : {}),
        ...(d.scheduledFor !== undefined
          ? { scheduledFor: d.scheduledFor ? new Date(d.scheduledFor) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, param(req, "id")))
      .returning();

    res.json({ listing: serializeListing(row) });
  }),
);

// ─── Delete (soft delete; owner only) ─────────────────────────────────────────

router.delete(
  "/listings/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, param(req, "id")), isNull(listings.deletedAt)))
      .limit(1);
    if (!existing) throw new HttpError(404, "Listing not found");
    if (existing.sellerId !== req.user!.id) {
      throw new HttpError(403, "You do not own this listing");
    }

    await db
      .update(listings)
      .set({ status: "removed", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(listings.id, param(req, "id")));

    res.json({ ok: true });
  }),
);

export default router;
