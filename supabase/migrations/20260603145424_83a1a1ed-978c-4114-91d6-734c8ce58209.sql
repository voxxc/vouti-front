
-- Marcadores (etiquetas) de processos por projeto
CREATE TABLE public.project_protocolo_marcadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6366f1',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_protocolo_marcadores TO authenticated;
GRANT ALL ON public.project_protocolo_marcadores TO service_role;

ALTER TABLE public.project_protocolo_marcadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view marcadores of their tenant"
ON public.project_protocolo_marcadores FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can insert marcadores in their tenant"
ON public.project_protocolo_marcadores FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update marcadores of their tenant"
ON public.project_protocolo_marcadores FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete marcadores of their tenant"
ON public.project_protocolo_marcadores FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE INDEX idx_project_protocolo_marcadores_project ON public.project_protocolo_marcadores(project_id);

-- Atribuição de marcadores a protocolos
CREATE TABLE public.project_protocolo_marcador_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id uuid NOT NULL REFERENCES public.project_protocolos(id) ON DELETE CASCADE,
  marcador_id uuid NOT NULL REFERENCES public.project_protocolo_marcadores(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocolo_id, marcador_id)
);

GRANT SELECT, INSERT, DELETE ON public.project_protocolo_marcador_assignments TO authenticated;
GRANT ALL ON public.project_protocolo_marcador_assignments TO service_role;

ALTER TABLE public.project_protocolo_marcador_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view marcador assignments of their tenant"
ON public.project_protocolo_marcador_assignments FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can insert marcador assignments in their tenant"
ON public.project_protocolo_marcador_assignments FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete marcador assignments of their tenant"
ON public.project_protocolo_marcador_assignments FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE INDEX idx_marcador_assign_protocolo ON public.project_protocolo_marcador_assignments(protocolo_id);
CREATE INDEX idx_marcador_assign_marcador ON public.project_protocolo_marcador_assignments(marcador_id);
