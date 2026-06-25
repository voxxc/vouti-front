CREATE TABLE public.planejador_mandamentais (
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
  CONSTRAINT planejador_mandamentais_status_check CHECK (status IN ('pendente','atribuido','arquivado'))
);

CREATE INDEX idx_planejador_mandamentais_tenant ON public.planejador_mandamentais(tenant_id, status, created_at DESC);
CREATE INDEX idx_planejador_mandamentais_deadline ON public.planejador_mandamentais(deadline_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejador_mandamentais TO authenticated;
GRANT ALL ON public.planejador_mandamentais TO service_role;

ALTER TABLE public.planejador_mandamentais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view mandamentais"
ON public.planejador_mandamentais FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_mandamentais.tenant_id
  )
);

CREATE POLICY "Tenant members can insert mandamentais"
ON public.planejador_mandamentais FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_mandamentais.tenant_id
  )
);

CREATE POLICY "Tenant members can update mandamentais"
ON public.planejador_mandamentais FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_mandamentais.tenant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_mandamentais.tenant_id
  )
);

CREATE POLICY "Tenant members can delete mandamentais"
ON public.planejador_mandamentais FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.tenant_id = planejador_mandamentais.tenant_id
  )
);

CREATE TRIGGER trg_planejador_mandamentais_updated_at
BEFORE UPDATE ON public.planejador_mandamentais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();