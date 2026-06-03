import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, savedAddresses } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const addressSchema = z.object({
  fullName: z.string().min(1).max(140),
  streetAddress: z.string().min(1).max(300),
  city: z.string().min(1).max(120),
  stateProvince: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(40).nullable().optional(),
  countryCode: z.string().min(2).max(2),
  phoneNumber: z.string().max(40).nullable().optional(),
  isDefault: z.boolean().optional(),
});

router.get(
  "/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(savedAddresses)
      .where(eq(savedAddresses.userId, req.user!.id))
      .orderBy(desc(savedAddresses.isDefault), desc(savedAddresses.createdAt));
    res.json({ addresses: rows });
  }),
);

router.post(
  "/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const uid = req.user!.id;
    if (parsed.data.isDefault) {
      await db
        .update(savedAddresses)
        .set({ isDefault: false })
        .where(eq(savedAddresses.userId, uid));
    }
    const [row] = await db
      .insert(savedAddresses)
      .values({ ...parsed.data, userId: uid })
      .returning();
    res.status(201).json({ address: row });
  }),
);

router.patch(
  "/addresses/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = addressSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid input");
    const uid = req.user!.id;
    if (parsed.data.isDefault) {
      await db
        .update(savedAddresses)
        .set({ isDefault: false })
        .where(eq(savedAddresses.userId, uid));
    }
    const [row] = await db
      .update(savedAddresses)
      .set(parsed.data)
      .where(
        and(eq(savedAddresses.id, param(req, "id")), eq(savedAddresses.userId, uid)),
      )
      .returning();
    if (!row) throw new HttpError(404, "Address not found");
    res.json({ address: row });
  }),
);

router.delete(
  "/addresses/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(savedAddresses)
      .where(
        and(
          eq(savedAddresses.id, param(req, "id")),
          eq(savedAddresses.userId, req.user!.id),
        ),
      )
      .returning();
    if (!row) throw new HttpError(404, "Address not found");
    res.json({ ok: true });
  }),
);

export default router;
