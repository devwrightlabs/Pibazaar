-- ============================================================
-- Row Level Security policies for the listings table
-- ============================================================

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings (buyers browsing the marketplace).
-- Sellers can also view their own inactive listings.
CREATE POLICY "Anyone can view listings"
  ON public.listings FOR SELECT
  USING (
    is_active = true
    OR auth.uid()::text = seller_id
  );

-- Only the seller/owner can insert their own listings.
CREATE POLICY "Users can insert own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid()::text = seller_id);

-- Only the seller/owner can update their own listings.
CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid()::text = seller_id)
  WITH CHECK (auth.uid()::text = seller_id);

-- Only the seller/owner can delete their own listings.
CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid()::text = seller_id);

-- ============================================================
-- Row Level Security policies for the user_profiles table
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (public marketplace).
CREATE POLICY "Anyone can view profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Users can insert their own profile.
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = pi_uid);

-- Users can only update their own profile data.
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid()::text = pi_uid)
  WITH CHECK (auth.uid()::text = pi_uid);
