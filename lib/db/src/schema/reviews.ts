import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { escrowTransactions } from "./escrow";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    escrowId: uuid("escrow_id").references(() => escrowTransactions.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("reviews_reviewer_escrow_unique").on(t.reviewerId, t.escrowId),
    index("reviews_reviewee_idx").on(t.revieweeId),
  ],
);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  reviewerId: true,
  createdAt: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
