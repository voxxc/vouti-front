-- Adicionar colunas para comentário de conclusão na tabela deadlines
ALTER TABLE public.deadlines
ADD COLUMN IF NOT EXISTS comentario_conclusao text,
ADD COLUMN IF NOT EXISTS concluido_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS concluido_em timestamp with time zone;

-- Índice para consultas de prazos concluídos
CREATE INDEX IF NOT EXISTS idx_deadlines_concluido_em ON public.deadlines(concluido_em) WHERE completed = true;