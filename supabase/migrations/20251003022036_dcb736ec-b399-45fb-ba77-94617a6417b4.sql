-- Add comentario column to leads_captacao table
ALTER TABLE public.leads_captacao ADD COLUMN IF NOT EXISTS comentario text;