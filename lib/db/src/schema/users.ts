import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { timestamps } from "./_shared";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const themePreferenceEnum = pgEnum("theme_preference", [
  "dark",
  "light",
]);
export const jurisdictionModeEnum = pgEnum("jurisdiction_mode", [
  "local",
  "global",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Pi Network identifier — the sole identity/auth mechanism for this app.
  // Pi Network compliance: Pi Authentication SDK only. No password-based
  // credentials and no email collection are permitted, so neither field
  // exists on this table.
  piUid: text("pi_uid").unique(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  walletAddress: text("wallet_address"),
  piWalletAddress: text("pi_wallet_address"),
  isVerified: boolean("is_verified").notNull().default(false),
  isKycVerified: boolean("is_kyc_verified").notNull().default(false),
  role: userRoleEnum("role").notNull().default("user"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  trustScore: numeric("trust_score", { precision: 3, scale: 2 })
    .notNull()
    .default("0"),
  totalSales: integer("total_sales").notNull().default(0),
  themePreference: themePreferenceEnum("theme_preference")
    .notNull()
    .default("dark"),
  jurisdictionMode: jurisdictionModeEnum("jurisdiction_mode")
    .notNull()
    .default("local"),
  country: text("country"),
  ...timestamps,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Public-facing user shape (Pi-only app: no sensitive credential fields exist
// on User to begin with, so this is currently an identity alias).
export type PublicUser = User;
