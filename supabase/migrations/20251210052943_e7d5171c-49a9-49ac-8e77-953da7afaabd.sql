-- Add processo_oab_id column to tasks table for linking cards to processes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS processo_oab_id uuid REFERENCES public.processos_oab(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_processo_oab_id ON public.tasks(processo_oab_id);

-- Create task_tarefas table for project card tasks timeline
CREATE TABLE IF NOT EXISTS public.task_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  fase text,
  data_execucao date NOT NULL,
  observacoes text,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_tarefas_task_id ON public.task_tarefas(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tarefas_tenant_id ON public.task_tarefas(tenant_id);

-- Enable RLS
ALTER TABLE public.task_tarefas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_tarefas
CREATE POLICY "Users can view task_tarefas in tenant"
ON public.task_tarefas FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create task_tarefas in tenant"
ON public.task_tarefas FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own task_tarefas"
ON public.task_tarefas FOR UPDATE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete their own task_tarefas"
ON public.task_tarefas FOR DELETE
USING (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage tenant task_tarefas"
ON public.task_tarefas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_task_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_task_tarefas_updated_at
BEFORE UPDATE ON public.task_tarefas
FOR EACH ROW
EXECUTE FUNCTION update_task_tarefas_updated_at();