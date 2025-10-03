-- Criar bucket para anexos de mensagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Criar tabela de anexos de mensagens
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para message_attachments
CREATE POLICY "Users can view attachments from their messages"
ON public.message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
    AND (m.sender_id::text = auth.uid()::text OR m.receiver_id::text = auth.uid()::text)
  )
);

CREATE POLICY "Users can create attachments for their messages"
ON public.message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
    AND m.sender_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can delete attachments from their messages"
ON public.message_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_attachments.message_id
    AND m.sender_id::text = auth.uid()::text
  )
);

-- RLS Policies para storage bucket
CREATE POLICY "Users can view their message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Adicionar política de DELETE para mensagens
CREATE POLICY "Users can delete their sent messages"
ON public.messages FOR DELETE
USING (auth.uid()::text = sender_id::text);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);