import { pgTable, uuid, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timestamps } from "./_shared";
import { users } from "./users";

export const savedAddresses = pgTable("saved_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  stateProvince: text("state_province"),
  postalCode: text("postal_code"),
  countryCode: text("country_code").notNull(),
  phoneNumber: text("phone_number"),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});

export const insertAddressSchema = createInsertSchema(savedAddresses).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type SavedAddress = typeof savedAddresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
