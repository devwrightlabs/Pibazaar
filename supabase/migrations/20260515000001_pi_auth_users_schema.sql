-- =============================================================================
-- pi-auth schema: pi_id-based authentication
-- =============================================================================
-- Run this in the Supabase SQL Editor before deploying the `pi-auth`
-- Edge Function. It augments the existing `public.users` table with the
-- columns required for the new pi_id + password auth flow.
--
-- Wallet-privacy rule: we deliberately store NO wallet addresses or
-- passphrases here. Wallet info is collected only at checkout and lives
-- in `pi_wallet_address` / `pi_username` (added in 20260513000001) when
-- the user opts in.
-- =============================================================================

-- 1. pi_id — universal Pi Network identifier the user logs in with.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pi_id text;

-- Backfill any legacy rows so the unique index can be created safely.
UPDATE public.users
SET pi_id = pi_uid
WHERE pi_id IS NULL;

ALTER TABLE public.users
  ALTER COLUMN pi_id SET NOT NULL;

-- Case-insensitive uniqueness — Pi IDs are not case-sensitive.
CREATE UNIQUE INDEX IF NOT EXISTS users_pi_id_unique
  ON public.users (lower(pi_id));

-- 2. password_hash — bcrypt/argon2 hash produced inside the Edge Function.
--    The Edge Function MUST hash the password (bcrypt, cost ≥ 10) before
--    insert. Plain passwords must never be written here.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 3. Audit columns for the auth flow.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS pi_verified_at timestamptz;

-- 4. Defense-in-depth: revoke direct anon access to password_hash.
--    The Edge Function uses the service-role key, which bypasses RLS, so
--    nothing here breaks the function. Browser clients (anon key) are
--    blocked from ever reading the hash column.
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated';
EXCEPTION WHEN undefined_column THEN
  -- column missing in older envs — ignore
  NULL;
END$$;

COMMENT ON COLUMN public.users.pi_id IS
  'Universal Pi Network identifier used as the login username. Unique, case-insensitive.';
COMMENT ON COLUMN public.users.password_hash IS
  'bcrypt/argon2 hash of the user password. Set ONLY by the pi-auth Edge Function. Never readable by anon or authenticated roles.';
