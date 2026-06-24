CREATE TABLE public.planejador_revisionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  cliente_nome TEXT,
  project_id UUID,
  created_by UUID NOT NULL,
  assigned_to UUID,
  deadline_id UUID,
  atribuido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT planejador_revisionais_status_check CHECK (status IN ('pendente','atribuido','arquivado'))
);

CREATE INDEX idx_planejador_revisionais_tenant ON public.planejador_revisionais(tenant_id, status, created_at DESC);
CREATE INDEX idx_planejador_revisionais_deadline ON public.planejador_revisionais(deadline_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejador_revisionais TO authenticated;
GRANT ALL ON public.planejador_revisionais TO service_role;

ALTER TABLE public.planejador_revisionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view revisionais"
ON public.planejador_revisionais FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_revisionais.tenant_id
  )
);

CREATE POLICY "Tenant members can insert revisionais"
ON public.planejador_revisionais FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_revisionais.tenant_id
  )
);

CREATE POLICY "Tenant members can update revisionais"
ON public.planejador_revisionais FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_revisionais.tenant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_revisionais.tenant_id
  )
);

CREATE POLICY "Tenant members can delete revisionais"
ON public.planejador_revisionais FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_revisionais.tenant_id
  )
);

CREATE TRIGGER trg_planejador_revisionais_updated_at
BEFORE UPDATE ON public.planejador_revisionais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();