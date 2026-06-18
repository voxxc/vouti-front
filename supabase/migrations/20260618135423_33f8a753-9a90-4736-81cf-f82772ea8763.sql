ALTER TABLE public.planejador_task_subtasks
  ADD COLUMN IF NOT EXISTS comentario_conclusao text,
  ADD COLUMN IF NOT EXISTS concluida_em timestamptz;