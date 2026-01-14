-- Adicionar coluna para rastrear origem do prazo (protocolo/etapa)
ALTER TABLE public.deadlines 
ADD COLUMN protocolo_etapa_id uuid REFERENCES public.project_protocolo_etapas(id) ON DELETE SET NULL;

-- Índice para melhor performance em queries
CREATE INDEX idx_deadlines_protocolo_etapa_id ON public.deadlines(protocolo_etapa_id);

-- Comentário para documentação
COMMENT ON COLUMN public.deadlines.protocolo_etapa_id IS 'Referência à etapa de protocolo que originou este prazo';