-- Adicionar coluna processo_oab_id na tabela deadlines para vincular prazos a processos
ALTER TABLE public.deadlines ADD COLUMN IF NOT EXISTS processo_oab_id UUID REFERENCES public.processos_oab(id) ON DELETE SET NULL;

-- Criar indice para performance
CREATE INDEX IF NOT EXISTS idx_deadlines_processo_oab_id ON public.deadlines(processo_oab_id);