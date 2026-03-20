
-- Add columns to planejador_task_messages
ALTER TABLE public.planejador_task_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.planejador_task_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('planejador-chat-files', 'planejador-chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: anyone can read (public bucket)
CREATE POLICY "Public read planejador chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'planejador-chat-files');

-- Policy: authenticated users can upload
CREATE POLICY "Authenticated upload planejador chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'planejador-chat-files');

-- Policy: users can delete their own uploads
CREATE POLICY "Users delete own planejador chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'planejador-chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
