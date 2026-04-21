ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS cabecalho_html TEXT,
  ADD COLUMN IF NOT EXISTS rodape_html TEXT;