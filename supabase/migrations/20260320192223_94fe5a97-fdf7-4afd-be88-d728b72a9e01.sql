
-- Subtasks
CREATE TABLE public.planejador_task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  prazo TIMESTAMPTZ,
  concluida BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planejador_task_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.planejador_task_subtasks FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Files
CREATE TABLE public.planejador_task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planejador_task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.planejador_task_files FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Participants
CREATE TABLE public.planejador_task_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
ALTER TABLE public.planejador_task_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.planejador_task_participants FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Labels
CREATE TABLE public.planejador_task_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planejador_task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.planejador_task_labels FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Label assignments
CREATE TABLE public.planejador_task_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.planejador_task_labels(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);
ALTER TABLE public.planejador_task_label_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON public.planejador_task_label_assignments FOR ALL USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
