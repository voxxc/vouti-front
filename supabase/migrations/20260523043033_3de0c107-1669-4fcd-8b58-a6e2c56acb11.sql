
ALTER TABLE public.processos_oab ADD COLUMN IF NOT EXISTS with_attachments boolean NOT NULL DEFAULT false;
ALTER TABLE public.cnpjs_cadastrados ADD COLUMN IF NOT EXISTS with_attachments boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.judit_migracao_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  processo_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('oab','cnpj')),
  tracking_id_antigo text,
  tracking_id_novo text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','migrado','erro')),
  erro text,
  executado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_judit_migracao_attachments_tenant ON public.judit_migracao_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_judit_migracao_attachments_processo ON public.judit_migracao_attachments(processo_id);

ALTER TABLE public.judit_migracao_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins do tenant veem migracao attachments"
  ON public.judit_migracao_attachments
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR public.has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id)
    OR public.has_role_in_tenant(auth.uid(), 'controller'::app_role, tenant_id)
  );
