INSERT INTO storage.buckets (id, name, public) VALUES ('landing-images', 'landing-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Landing images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-images');

CREATE POLICY "Service role can upload landing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-images');