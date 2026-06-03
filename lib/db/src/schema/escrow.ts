import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timestamps } from "./_shared";
import { users } from "./users";
import { listings } from "./listings";
import { savedAddresses } from "./addresses";

export const escrowStatusEnum = pgEnum("escrow_status", [
  "pending",
  "funded",
  "shipped",
  "delivered",
  "released",
  "completed",
  "auto_released",
  "disputed",
  "cancelled",
]);

// How the escrow is fulfilled and released:
// - shipping: physical goods shipped via courier, released on delivery/confirm
// - local_meetup: in-person handover, released by scanning buyer's QR code
// - digital: digital goods/services, released per milestone or on proof delivery
export const releaseTypeEnum = pgEnum("escrow_release_type", [
  "shipping",
  "local_meetup",
  "digital",
]);

export type EscrowMilestone = {
  id: string;
  title: string;
  amountPi: number;
  status: "pending" | "released";
  releasedAt?: string;
};

export const escrowTransactions = pgTable(
  "escrow_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amountPi: numeric("amount_pi", { precision: 18, scale: 4 }).notNull(),
    platformFeePi: numeric("platform_fee_pi", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    status: escrowStatusEnum("status").notNull().default("pending"),
    releaseType: releaseTypeEnum("release_type").notNull().default("shipping"),
    piPaymentId: text("pi_payment_id").unique(),
    piTxid: text("pi_txid"),
    shippingMethod: text("shipping_method"),
    shippingCarrier: text("shipping_carrier"),
    shippingAddressId: uuid("shipping_address_id").references(
      () => savedAddresses.id,
      { onDelete: "set null" },
    ),
    trackingNumber: text("tracking_number"),
    deliveryProof: text("delivery_proof"),
    // Token encoded in the buyer's QR code for local-meetup release.
    meetupCode: text("meetup_code"),
    // Array of EscrowMilestone for digital/service phased releases.
    milestones: jsonb("milestones").$type<EscrowMilestone[]>(),
    disputeReason: text("dispute_reason"),
    notes: text("notes"),
    autoReleaseAt: timestamp("auto_release_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("escrow_buyer_idx").on(t.buyerId),
    index("escrow_seller_idx").on(t.sellerId),
    index("escrow_listing_idx").on(t.listingId),
    index("escrow_status_idx").on(t.status),
  ],
);

export const insertEscrowSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
