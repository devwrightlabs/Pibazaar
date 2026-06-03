import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  numeric,
  doublePrecision,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timestamps } from "./_shared";
import { users } from "./users";

export const listingConditionEnum = pgEnum("listing_condition", [
  "new",
  "like_new",
  "good",
  "fair",
]);
export const productTypeEnum = pgEnum("product_type", [
  "physical",
  "digital",
  "service",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "active",
  "sold",
  "removed",
  "scheduled",
]);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priceInPi: numeric("price_in_pi", { precision: 18, scale: 4 }).notNull(),
    category: text("category").notNull(),
    condition: listingConditionEnum("condition").notNull().default("good"),
    productType: productTypeEnum("product_type").notNull().default("physical"),
    status: listingStatusEnum("status").notNull().default("active"),
    images: text("images").array().notNull().default([]),
    locationLat: doublePrecision("location_lat"),
    locationLng: doublePrecision("location_lng"),
    city: text("city"),
    country: text("country"),
    originCountry: text("origin_country"),
    allowOffers: boolean("allow_offers").notNull().default(true),
    isBoosted: boolean("is_boosted").notNull().default(false),
    isProSeller: boolean("is_pro_seller").notNull().default(false),
    shippingCarrier: text("shipping_carrier"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("listings_seller_idx").on(t.sellerId),
    index("listings_status_idx").on(t.status),
    index("listings_category_idx").on(t.category),
  ],
);

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
