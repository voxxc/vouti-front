-- Make op-fichas-tecnicas bucket private to prevent unauthenticated access
UPDATE storage.buckets SET public = false WHERE id = 'op-fichas-tecnicas';

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Public can view fichas tecnicas" ON storage.objects;
DROP POLICY IF EXISTS "Fichas tecnicas are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view fichas" ON storage.objects;

-- Create authenticated-only SELECT policy
CREATE POLICY "Authenticated users can view fichas tecnicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'op-fichas-tecnicas' AND auth.role() = 'authenticated');