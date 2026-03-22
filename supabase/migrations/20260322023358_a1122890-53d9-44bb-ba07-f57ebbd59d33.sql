-- 1. Update notifications type constraint to include planejador_chat_message
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'project_update'::text, 'task_moved'::text, 'task_created'::text, 'mention'::text, 
  'comment_added'::text, 'andamento_processo'::text, 'deadline_assigned'::text, 
  'deadline_tagged'::text, 'project_added'::text, 'comment_mention'::text, 
  'conversation_transferred'::text, 'planejador_chat_message'::text
]));

-- 2. Create planejador_task_etapas table
CREATE TABLE public.planejador_task_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  concluida BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planejador_task_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.planejador_task_etapas
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_planejador_task_etapas_task ON public.planejador_task_etapas(task_id);

-- 3. Create planejador_task_activity_log table
CREATE TABLE public.planejador_task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planejador_task_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.planejador_task_activity_log
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_planejador_activity_log_task ON public.planejador_task_activity_log(task_id);