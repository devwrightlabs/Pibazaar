import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timestamps } from "./_shared";

// Service range a courier covers. The shipping directory is purely informational:
// the app never manages, tracks, or facilitates fulfillment — couriers are shown
// as outbound links grouped by range, and all handling happens offline.
export const shippingServiceRangeEnum = pgEnum("shipping_service_range", [
  "local",
  "regional",
  "international",
]);

// Directory of external courier / shipping services, scoped by country so the
// app can surface region-appropriate options (e.g. Bahamas -> GoPost, Mr. Ship It).
export const shippingCarriers = pgTable(
  "shipping_carriers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // ISO-3166 alpha-2 country code this carrier serves (e.g. "BS").
    countryCode: text("country_code").notNull(),
    countryName: text("country_name"),
    // Coverage category used to group couriers in the directory UI.
    serviceRange: shippingServiceRangeEnum("service_range")
      .notNull()
      .default("local"),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("shipping_carriers_country_idx").on(t.countryCode),
    index("shipping_carriers_range_idx").on(t.serviceRange),
  ],
);

export const insertShippingCarrierSchema = createInsertSchema(
  shippingCarriers,
).omit({ id: true, createdAt: true, updatedAt: true });

export type ShippingCarrier = typeof shippingCarriers.$inferSelect;
export type InsertShippingCarrier = z.infer<typeof insertShippingCarrierSchema>;
