-- Username/password auth pivot support
-- Adds optional Pi identity columns while keeping legacy wallet compatibility.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_username'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN pi_username TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_wallet_address'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN pi_wallet_address TEXT;
  END IF;
END
$$;

-- Ensure optional Pi columns are explicitly nullable for deferred wallet connection.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_username'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN pi_username DROP NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pi_wallet_address'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN pi_wallet_address DROP NOT NULL;
  END IF;
END
$$;

-- Username-based accounts rely on unique platform usernames.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_username_unique'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END
$$;
