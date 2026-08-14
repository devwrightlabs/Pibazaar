import {
  pgTable,
  uuid,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { listings } from "./listings";

/**
 * favorites — per-user listing wishlist.
 *
 * Business rules enforced here:
 *  - user_id + listing_id pair is UNIQUE → toggle semantics at the API layer
 *  - user_id and listing_id are FK-cascaded so deleting a user/listing cleans up
 *
 * Security: the API layer ALWAYS scopes queries by req.user.id; the unique
 * constraint prevents accidental duplication, and the FK prevents orphans.
 */
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("favorites_user_listing_uniq").on(t.userId, t.listingId),
    index("favorites_user_idx").on(t.userId),
    index("favorites_listing_idx").on(t.listingId),
  ],
);

export type Favorite = typeof favorites.$inferSelect;
