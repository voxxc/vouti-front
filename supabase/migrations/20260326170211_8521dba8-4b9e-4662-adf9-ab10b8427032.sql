
ALTER TABLE public.link_profiles
  ADD COLUMN IF NOT EXISTS bg_image_url text,
  ADD COLUMN IF NOT EXISTS show_username boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_avatar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Create storage bucket for link backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('link-backgrounds', 'link-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload backgrounds"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'link-backgrounds');

-- RLS: public read
CREATE POLICY "Public read backgrounds"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'link-backgrounds');

-- RLS: owners can update/delete their files
CREATE POLICY "Users can manage own backgrounds"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'link-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own backgrounds"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'link-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
