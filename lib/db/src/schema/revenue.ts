import { pgTable, uuid, numeric, timestamp } from "drizzle-orm/pg-core";
import { escrowTransactions } from "./escrow";

export const platformRevenue = pgTable("platform_revenue", {
  id: uuid("id").primaryKey().defaultRandom(),
  escrowId: uuid("escrow_id").references(() => escrowTransactions.id, {
    onDelete: "set null",
  }),
  amountPi: numeric("amount_pi", { precision: 18, scale: 4 }).notNull(),
  collectedAt: timestamp("collected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PlatformRevenue = typeof platformRevenue.$inferSelect;
