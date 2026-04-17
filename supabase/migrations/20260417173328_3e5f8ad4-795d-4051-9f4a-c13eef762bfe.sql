-- 1) Tabela de visualizações de tarefas do Planejador
CREATE TABLE IF NOT EXISTS public.planejador_task_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planejador_task_views_user
  ON public.planejador_task_views (user_id, last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_planejador_task_views_tenant
  ON public.planejador_task_views (tenant_id);

ALTER TABLE public.planejador_task_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own task views in tenant"
  ON public.planejador_task_views
  FOR SELECT
  USING (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users insert own task views in tenant"
  ON public.planejador_task_views
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users update own task views in tenant"
  ON public.planejador_task_views
  FOR UPDATE
  USING (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users delete own task views in tenant"
  ON public.planejador_task_views
  FOR DELETE
  USING (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());

-- 2) Coluna edited_at em planejador_task_messages
ALTER TABLE public.planejador_task_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz NULL;