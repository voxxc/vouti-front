
-- Create deadline_subtarefas table
CREATE TABLE public.deadline_subtarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id uuid REFERENCES public.deadlines(id) ON DELETE CASCADE NOT NULL,
  descricao text NOT NULL,
  atribuido_a uuid NOT NULL,
  criado_por uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  concluida boolean DEFAULT false,
  concluida_em timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deadline_subtarefas ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see subtarefas in their tenant
CREATE POLICY "Users can view subtarefas in their tenant"
  ON public.deadline_subtarefas
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- RLS: Users can insert subtarefas in their tenant
CREATE POLICY "Users can insert subtarefas in their tenant"
  ON public.deadline_subtarefas
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- RLS: Users can update subtarefas in their tenant
CREATE POLICY "Users can update subtarefas in their tenant"
  ON public.deadline_subtarefas
  FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- RLS: Users can delete subtarefas in their tenant
CREATE POLICY "Users can delete subtarefas in their tenant"
  ON public.deadline_subtarefas
  FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
