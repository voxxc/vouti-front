
-- Create public bucket for link avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('link-avatars', 'link-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own link avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'link-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own link avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'link-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own link avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'link-avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to read link avatars (public profiles)
CREATE POLICY "Anyone can read link avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'link-avatars');
