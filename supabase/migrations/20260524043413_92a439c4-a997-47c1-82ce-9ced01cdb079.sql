ALTER TABLE public.judit_migracao_attachments 
  ADD COLUMN IF NOT EXISTS antigo_pausado boolean,
  ADD COLUMN IF NOT EXISTS pausa_erro text;