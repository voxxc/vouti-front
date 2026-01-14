-- Adicionar coluna ordem para ordenação de processos vinculados ao projeto
ALTER TABLE public.project_processos
ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0;