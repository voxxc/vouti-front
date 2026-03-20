
-- Planejador Tasks
CREATE TABLE public.planejador_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pending',
  prazo timestamptz,
  proprietario_id uuid NOT NULL,
  responsavel_id uuid,
  prioridade text NOT NULL DEFAULT 'normal',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planejador_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their tenant"
ON public.planejador_tasks FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tasks in their tenant"
ON public.planejador_tasks FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update tasks in their tenant"
ON public.planejador_tasks FOR UPDATE
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete tasks in their tenant"
ON public.planejador_tasks FOR DELETE
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_planejador_tasks_updated_at
BEFORE UPDATE ON public.planejador_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_task_tarefas_updated_at();

-- Planejador Task Messages (chat per task)
CREATE TABLE public.planejador_task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planejador_task_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their tenant"
ON public.planejador_task_messages FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create messages in their tenant"
ON public.planejador_task_messages FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id());

-- Planejador Subtasks
CREATE TABLE public.planejador_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planejador_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subtasks in their tenant"
ON public.planejador_subtasks FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create subtasks in their tenant"
ON public.planejador_subtasks FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update subtasks in their tenant"
ON public.planejador_subtasks FOR UPDATE
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete subtasks in their tenant"
ON public.planejador_subtasks FOR DELETE
TO authenticated
USING (tenant_id = get_user_tenant_id());
