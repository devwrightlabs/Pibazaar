-- PiBazaar full schema — used by ensureSchema() for pglite (dev/test).
-- Production uses drizzle-kit push. This file must be idempotent (CREATE IF NOT EXISTS).

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE theme_preference AS ENUM ('dark', 'light');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE jurisdiction_mode AS ENUM ('local', 'global');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'fair');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('physical', 'digital', 'service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'removed', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE escrow_status AS ENUM (
    'pending', 'funded', 'shipped', 'delivered',
    'released', 'completed', 'auto_released', 'disputed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE escrow_release_type AS ENUM ('shipping', 'local_meetup', 'digital');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE shipping_service_range AS ENUM ('local', 'regional', 'international');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pi_uid"              text UNIQUE,
  "username"            text NOT NULL UNIQUE,
  "avatar_url"          text,
  "bio"                 text,
  "wallet_address"      text,
  "pi_wallet_address"   text,
  "is_verified"         boolean NOT NULL DEFAULT false,
  "is_kyc_verified"     boolean NOT NULL DEFAULT false,
  "role"                user_role NOT NULL DEFAULT 'user',
  "is_suspended"        boolean NOT NULL DEFAULT false,
  "trust_score"         numeric(3,2) NOT NULL DEFAULT 0,
  "total_sales"         integer NOT NULL DEFAULT 0,
  "theme_preference"    theme_preference NOT NULL DEFAULT 'dark',
  "jurisdiction_mode"   jurisdiction_mode NOT NULL DEFAULT 'local',
  "country"             text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "listings" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id"        uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"            text NOT NULL,
  "description"      text NOT NULL DEFAULT '',
  "price_in_pi"      numeric(18,4) NOT NULL,
  "category"         text NOT NULL,
  "condition"        listing_condition NOT NULL DEFAULT 'good',
  "product_type"     product_type NOT NULL DEFAULT 'physical',
  "status"           listing_status NOT NULL DEFAULT 'active',
  "images"           text[] NOT NULL DEFAULT '{}',
  "location_lat"     double precision,
  "location_lng"     double precision,
  "city"             text,
  "country"          text,
  "origin_country"   text,
  "allow_offers"     boolean NOT NULL DEFAULT true,
  "is_boosted"       boolean NOT NULL DEFAULT false,
  "is_pro_seller"    boolean NOT NULL DEFAULT false,
  "shipping_carrier" text,
  "scheduled_for"    timestamptz,
  "deleted_at"       timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "saved_addresses" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "full_name"        text NOT NULL,
  "street_address"   text NOT NULL,
  "city"             text NOT NULL,
  "state_province"   text,
  "postal_code"      text,
  "country_code"     text NOT NULL,
  "phone_number"     text,
  "is_default"       boolean NOT NULL DEFAULT false,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "escrow_transactions" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id"          uuid NOT NULL REFERENCES "listings"("id") ON DELETE RESTRICT,
  "buyer_id"            uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "seller_id"           uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "amount_pi"           numeric(18,4) NOT NULL,
  "platform_fee_pi"     numeric(18,4) NOT NULL DEFAULT 0,
  "status"              escrow_status NOT NULL DEFAULT 'pending',
  "release_type"        escrow_release_type NOT NULL DEFAULT 'shipping',
  "pi_payment_id"       text UNIQUE,
  "pi_txid"             text,
  "shipping_method"     text,
  "shipping_carrier"    text,
  "shipping_address_id" uuid REFERENCES "saved_addresses"("id") ON DELETE SET NULL,
  "tracking_number"     text,
  "delivery_proof"      text,
  "meetup_code"         text,
  "milestones"          jsonb,
  "dispute_reason"      text,
  "notes"               text,
  "auto_release_at"     timestamptz,
  "released_at"         timestamptz,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "conversations" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "participant_a"   uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "participant_b"   uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id"      uuid REFERENCES "listings"("id") ON DELETE SET NULL,
  "last_message"    text,
  "last_message_at" timestamptz,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("participant_a", "participant_b", "listing_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "messages" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id"       uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content"         text NOT NULL,
  "is_read"         boolean NOT NULL DEFAULT false,
  "created_at"      timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"       text NOT NULL,
  "title"      text NOT NULL,
  "body"       text,
  "is_read"    boolean NOT NULL DEFAULT false,
  "metadata"   jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reviews" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reviewer_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reviewee_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "escrow_id"    uuid REFERENCES "escrow_transactions"("id") ON DELETE SET NULL,
  "rating"       integer NOT NULL,
  "comment"      text,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("reviewer_id", "escrow_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "platform_revenue" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "escrow_id"    uuid REFERENCES "escrow_transactions"("id") ON DELETE SET NULL,
  "amount_pi"    numeric(18,4) NOT NULL,
  "collected_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "shipping_carriers" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"         text NOT NULL,
  "country_code" text NOT NULL,
  "country_name" text,
  "service_range" shipping_service_range NOT NULL DEFAULT 'local',
  "website_url"  text NOT NULL,
  "logo_url"     text,
  "description"  text,
  "is_active"    boolean NOT NULL DEFAULT true,
  "sort_order"   integer NOT NULL DEFAULT 0,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "listings_seller_idx" ON "listings" ("seller_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_status_idx" ON "listings" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_category_idx" ON "listings" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_buyer_idx"   ON "escrow_transactions" ("buyer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_seller_idx"  ON "escrow_transactions" ("seller_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_listing_idx" ON "escrow_transactions" ("listing_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escrow_status_idx"  ON "escrow_transactions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_participant_a_idx" ON "conversations" ("participant_a");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_participant_b_idx" ON "conversations" ("participant_b");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_reviewee_idx" ON "reviews" ("reviewee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipping_carriers_country_idx" ON "shipping_carriers" ("country_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipping_carriers_range_idx" ON "shipping_carriers" ("service_range");
