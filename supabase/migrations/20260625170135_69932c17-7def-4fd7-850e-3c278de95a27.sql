ALTER TABLE public.processos_oab 
  ADD COLUMN IF NOT EXISTS data_cadastro_sistema date,
  ADD COLUMN IF NOT EXISTS observacoes text;