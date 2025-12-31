-- Adicionar coluna ai_enabled na tabela processos_oab
ALTER TABLE public.processos_oab 
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN public.processos_oab.ai_enabled IS 'Indica se a Vouti IA está habilitada para este processo específico';