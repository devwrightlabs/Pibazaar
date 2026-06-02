-- Migration: Add wallet_address column to users table
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN wallet_address TEXT;
  END IF;
END
$$;
