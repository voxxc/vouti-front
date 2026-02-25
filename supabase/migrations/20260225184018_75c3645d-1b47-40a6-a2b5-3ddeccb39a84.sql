
-- Tabela de junção: carteira ↔ protocolo (mesma estrutura de project_carteira_processos)
CREATE TABLE public.project_carteira_protocolos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carteira_id UUID NOT NULL REFERENCES public.project_carteiras(id) ON DELETE CASCADE,
  project_protocolo_id UUID NOT NULL REFERENCES public.project_protocolos(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carteira_id, project_protocolo_id)
);

-- RLS
ALTER TABLE public.project_carteira_protocolos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view carteira protocolos"
ON public.project_carteira_protocolos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_carteiras pc
    WHERE pc.id = carteira_id
      AND pc.tenant_id = public.get_user_tenant_id()
  )
);

CREATE POLICY "Tenant members can insert carteira protocolos"
ON public.project_carteira_protocolos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_carteiras pc
    WHERE pc.id = carteira_id
      AND pc.tenant_id = public.get_user_tenant_id()
  )
);

CREATE POLICY "Tenant members can delete carteira protocolos"
ON public.project_carteira_protocolos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_carteiras pc
    WHERE pc.id = carteira_id
      AND pc.tenant_id = public.get_user_tenant_id()
  )
);

CREATE POLICY "Tenant members can update carteira protocolos"
ON public.project_carteira_protocolos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_carteiras pc
    WHERE pc.id = carteira_id
      AND pc.tenant_id = public.get_user_tenant_id()
  )
);
