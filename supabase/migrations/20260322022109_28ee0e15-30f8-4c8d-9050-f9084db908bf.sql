ALTER TABLE public.planejador_tasks
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processo_oab_id UUID REFERENCES public.processos_oab(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planejador_tasks_cliente ON public.planejador_tasks(cliente_id);
CREATE INDEX IF NOT EXISTS idx_planejador_tasks_processo ON public.planejador_tasks(processo_oab_id);