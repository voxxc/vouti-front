CREATE POLICY "Users upload planejador chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'planejador-chat-files');