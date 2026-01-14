-- Tabela para vincular processos OAB a projetos
CREATE TABLE IF NOT EXISTS public.project_processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  processo_oab_id UUID NOT NULL REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(projeto_id, processo_oab_id)
);

-- Enable RLS
ALTER TABLE public.project_processos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view project_processos in their tenant"
ON public.project_processos
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert project_processos in their tenant"
ON public.project_processos
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete project_processos in their tenant"
ON public.project_processos
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_project_processos_projeto ON public.project_processos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_project_processos_processo ON public.project_processos(processo_oab_id);
CREATE INDEX IF NOT EXISTS idx_project_processos_tenant ON public.project_processos(tenant_id);