-- Make platform-pix-qrcode bucket private
UPDATE storage.buckets SET public = false WHERE id = 'platform-pix-qrcode';

-- Add RLS policy for authenticated users to read from this bucket
CREATE POLICY "Authenticated users can view pix qrcodes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'platform-pix-qrcode');

-- Keep existing upload/delete policies or add if missing
CREATE POLICY "Authenticated users can upload pix qrcodes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'platform-pix-qrcode');

CREATE POLICY "Authenticated users can delete pix qrcodes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'platform-pix-qrcode');