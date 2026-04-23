ALTER TABLE public.planejador_tasks
ADD COLUMN IF NOT EXISTS pausado_ate timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_planejador_tasks_pausado_ate
ON public.planejador_tasks(pausado_ate)
WHERE pausado_ate IS NOT NULL;