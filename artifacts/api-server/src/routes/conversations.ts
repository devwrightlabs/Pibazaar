import { Router, type IRouter } from "express";
import { z } from "zod";
import { aliasedTable } from "drizzle-orm";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db, conversations, messages, users, listings } from "@workspace/db";
import { asyncHandler, HttpError, param } from "../lib/http";
import { requireAuth } from "../middlewares/auth";
import { serializePublicUser } from "../lib/serialize";
import { emitToUser } from "../lib/realtime";
import { notify } from "../lib/notify";

const router: IRouter = Router();

function isParticipant(
  conv: { participantA: string; participantB: string },
  uid: string,
): boolean {
  return conv.participantA === uid || conv.participantB === uid;
}

// ─── List conversations with the other party + unread counts ──────────────────

router.get(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const partnerA = aliasedTable(users, "partner_a");
    const partnerB = aliasedTable(users, "partner_b");

    const rows = await db
      .select({
        id: conversations.id,
        participantA: conversations.participantA,
        participantB: conversations.participantB,
        listingId: conversations.listingId,
        lastMessage: conversations.lastMessage,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        userA: partnerA,
        userB: partnerB,
        listingTitle: listings.title,
        unread: sql<number>`(
          select count(*)::int from ${messages} m
          where m.conversation_id = ${conversations.id}
            and m.is_read = false
            and m.sender_id <> ${uid}
        )`,
      })
      .from(conversations)
      .leftJoin(partnerA, eq(conversations.participantA, partnerA.id))
      .leftJoin(partnerB, eq(conversations.participantB, partnerB.id))
      .leftJoin(listings, eq(conversations.listingId, listings.id))
      .where(
        or(
          eq(conversations.participantA, uid),
          eq(conversations.participantB, uid),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt));

    const result = rows.map((r) => {
      const otherRow = r.participantA === uid ? r.userB : r.userA;
      return {
        id: r.id,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        lastMessage: r.lastMessage,
        lastMessageAt: r.lastMessageAt,
        createdAt: r.createdAt,
        unread: r.unread,
        otherUser: otherRow ? serializePublicUser(otherRow) : null,
      };
    });
    res.json({ conversations: result });
  }),
);

// ─── Start a conversation (or reuse) and send the first message ───────────────

const startSchema = z.object({
  recipientId: z.string().uuid(),
  listingId: z.string().uuid().nullable().optional(),
  content: z.string().min(1).max(4000),
});

router.post(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const uid = req.user!.id;
    const { recipientId, listingId, content } = parsed.data;
    if (recipientId === uid)
      throw new HttpError(400, "You cannot message yourself");

    const [recipient] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);
    if (!recipient) throw new HttpError(404, "Recipient not found");

    // Normalise participant ordering so the unique pair index is stable.
    const [a, b] = [uid, recipientId].sort();
    const listingFilter =
      listingId == null
        ? sql`${conversations.listingId} is null`
        : eq(conversations.listingId, listingId);

    let [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.participantA, a),
          eq(conversations.participantB, b),
          listingFilter,
        ),
      )
      .limit(1);

    if (!conv) {
      [conv] = await db
        .insert(conversations)
        .values({
          participantA: a,
          participantB: b,
          listingId: listingId ?? null,
        })
        .returning();
    }

    const [message] = await db
      .insert(messages)
      .values({ conversationId: conv.id, senderId: uid, content })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(conversations.id, conv.id));

    emitToUser(recipientId, { type: "message", payload: { ...message, conversationId: conv.id } });
    await notify(recipientId, {
      type: "message",
      title: `New message from ${req.user!.username}`,
      body: content.slice(0, 120),
      metadata: { conversationId: conv.id },
    });

    res.status(201).json({ conversationId: conv.id, message });
  }),
);

// ─── Fetch messages (and mark incoming as read) ───────────────────────────────

router.get(
  "/conversations/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, param(req, "id")))
      .limit(1);
    if (!conv || !isParticipant(conv, uid))
      throw new HttpError(404, "Conversation not found");

    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.createdAt);

    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conv.id),
          ne(messages.senderId, uid),
          eq(messages.isRead, false),
        ),
      );

    res.json({ messages: rows });
  }),
);

// ─── Send a message in an existing conversation ───────────────────────────────

router.post(
  "/conversations/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const content = z.string().min(1).max(4000).parse(req.body?.content);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, param(req, "id")))
      .limit(1);
    if (!conv || !isParticipant(conv, uid))
      throw new HttpError(404, "Conversation not found");

    const [message] = await db
      .insert(messages)
      .values({ conversationId: conv.id, senderId: uid, content })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessage: content, lastMessageAt: new Date() })
      .where(eq(conversations.id, conv.id));

    const recipientId =
      conv.participantA === uid ? conv.participantB : conv.participantA;
    emitToUser(recipientId, { type: "message", payload: { ...message, conversationId: conv.id } });
    await notify(recipientId, {
      type: "message",
      title: `New message from ${req.user!.username}`,
      body: content.slice(0, 120),
      metadata: { conversationId: conv.id },
    });

    res.status(201).json({ message });
  }),
);

export default router;
