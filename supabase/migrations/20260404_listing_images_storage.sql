-- Create the public listing-images storage bucket.
-- A public bucket allows buyers to view product photos without authentication.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true);

-- ============================================================
-- Storage RLS policies on storage.objects
-- ============================================================

-- Anyone can read/download files from the listing-images bucket (no auth required).
CREATE POLICY "Anyone can read listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Authenticated users can upload files to the listing-images bucket.
-- Files must be scoped under the uploading user's own folder: {user_id}/...
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only update their own uploads (matched by folder prefix).
CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete their own uploads (matched by folder prefix).
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
