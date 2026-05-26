ALTER TABLE public.judit_migracao_attachments
  ADD COLUMN IF NOT EXISTS customer_key text,
  ADD COLUMN IF NOT EXISTS motivo text DEFAULT 'migracao_anexos';