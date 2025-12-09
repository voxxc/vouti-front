-- Adicionar coluna para marcar processos importados manualmente
ALTER TABLE public.processos_oab 
ADD COLUMN IF NOT EXISTS importado_manualmente BOOLEAN DEFAULT false;