import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, shippingCarriers } from "@workspace/db";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Public directory of courier links (geo-scoped) ───────────────────────────

const SERVICE_RANGES = ["local", "regional", "international"] as const;
type ServiceRange = (typeof SERVICE_RANGES)[number];

router.get(
  "/shipping/carriers",
  asyncHandler(async (req, res) => {
    const country =
      typeof req.query.country === "string"
        ? req.query.country.toUpperCase()
        : undefined;
    const range =
      typeof req.query.serviceRange === "string" &&
      SERVICE_RANGES.includes(req.query.serviceRange as ServiceRange)
        ? (req.query.serviceRange as ServiceRange)
        : undefined;

    const rows = await db
      .select()
      .from(shippingCarriers)
      .where(
        and(
          eq(shippingCarriers.isActive, true),
          country ? eq(shippingCarriers.countryCode, country) : undefined,
          range ? eq(shippingCarriers.serviceRange, range) : undefined,
        ),
      )
      .orderBy(asc(shippingCarriers.sortOrder), asc(shippingCarriers.name));

    // Pre-grouped by coverage so the directory can render clean Local / Regional /
    // International sections of outbound links. The directory is informational
    // only — fulfillment is arranged offline between buyer and seller.
    const grouped: Record<ServiceRange, typeof rows> = {
      local: [],
      regional: [],
      international: [],
    };
    for (const row of rows) grouped[row.serviceRange].push(row);

    res.json({
      carriers: rows,
      grouped,
      disclaimer:
        "This directory is informational only. PiBazaar does not manage, track, or facilitate shipping. All fulfillment and handling are arranged and completed offline, directly between buyer and seller.",
    });
  }),
);

// ─── Admin management ─────────────────────────────────────────────────────────

const carrierSchema = z.object({
  name: z.string().min(1).max(120),
  countryCode: z.string().min(2).max(2),
  countryName: z.string().max(120).optional(),
  serviceRange: z.enum(SERVICE_RANGES).optional(),
  websiteUrl: z.string().url(),
  logoUrl: z.string().url().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/shipping/carriers",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = carrierSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const [row] = await db
      .insert(shippingCarriers)
      .values({
        ...parsed.data,
        countryCode: parsed.data.countryCode.toUpperCase(),
      })
      .returning();
    res.status(201).json({ carrier: row });
  }),
);

export default router;
