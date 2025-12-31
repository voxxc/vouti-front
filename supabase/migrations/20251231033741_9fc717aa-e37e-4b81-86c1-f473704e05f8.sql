-- Corrigir constraint de tipos da tabela notifications
-- Remover constraint antiga que não inclui os novos tipos
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar nova constraint com todos os tipos usados no sistema
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'project_update'::text,
  'task_moved'::text,
  'task_created'::text,
  'mention'::text,
  'comment_added'::text,
  'andamento_processo'::text,
  'deadline_assigned'::text,
  'deadline_tagged'::text,
  'project_added'::text
]));