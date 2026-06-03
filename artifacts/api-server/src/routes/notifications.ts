import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { db, notifications } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, uid))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    const [unread] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, uid), eq(notifications.isRead, false)),
      );
    res.json({ notifications: rows, unread: unread.value });
  }),
);

router.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user!.id));
    res.json({ ok: true });
  }),
);

router.post(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [row] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, param(req, "id")),
          eq(notifications.userId, req.user!.id),
        ),
      )
      .returning();
    if (!row) throw new HttpError(404, "Notification not found");
    res.json({ notification: row });
  }),
);

export default router;
