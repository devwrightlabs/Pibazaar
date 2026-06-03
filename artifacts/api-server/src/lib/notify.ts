import { db, notifications, type InsertNotification } from "@workspace/db";
import { emitToUser } from "./realtime";

export async function notify(
  userId: string,
  payload: Omit<InsertNotification, "userId">,
) {
  const [row] = await db
    .insert(notifications)
    .values({ ...payload, userId })
    .returning();
  emitToUser(userId, { type: "notification", payload: row });
  return row;
}
