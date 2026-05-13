-- Migration: Add optional Pi wallet profile fields to users table
-- Idempotent and safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_wallet_address'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN pi_wallet_address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_username'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN pi_username TEXT;
  END IF;
END
$$;

ALTER TABLE public.users
  ALTER COLUMN pi_wallet_address DROP NOT NULL,
  ALTER COLUMN pi_username DROP NOT NULL;

