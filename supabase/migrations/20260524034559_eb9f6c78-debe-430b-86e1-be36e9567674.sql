ALTER TABLE public.judit_migracao_attachments
  ADD COLUMN IF NOT EXISTS numero_cnj text;

CREATE INDEX IF NOT EXISTS idx_judit_migracao_attachments_tenant
  ON public.judit_migracao_attachments (tenant_id, executado_em DESC);

CREATE OR REPLACE FUNCTION public.get_migracao_attachments_por_tenant()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  oab_ativos bigint,
  oab_migrados bigint,
  cnpj_ativos bigint,
  cnpj_migrados bigint,
  ultimo_evento timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    COALESCE((SELECT COUNT(*) FROM processos_oab p WHERE p.tenant_id=t.id AND p.monitoramento_ativo=true AND p.tracking_id IS NOT NULL), 0) AS oab_ativos,
    COALESCE((SELECT COUNT(*) FROM processos_oab p WHERE p.tenant_id=t.id AND p.monitoramento_ativo=true AND p.with_attachments=true AND p.tracking_id IS NOT NULL), 0) AS oab_migrados,
    COALESCE((SELECT COUNT(*) FROM cnpjs_cadastrados c WHERE c.tenant_id=t.id AND c.monitoramento_ativo=true AND c.tracking_id IS NOT NULL), 0) AS cnpj_ativos,
    COALESCE((SELECT COUNT(*) FROM cnpjs_cadastrados c WHERE c.tenant_id=t.id AND c.monitoramento_ativo=true AND c.with_attachments=true AND c.tracking_id IS NOT NULL), 0) AS cnpj_migrados,
    (SELECT MAX(j.executado_em) FROM judit_migracao_attachments j WHERE j.tenant_id=t.id) AS ultimo_evento
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM processos_oab p WHERE p.tenant_id=t.id AND p.monitoramento_ativo=true AND p.tracking_id IS NOT NULL
    UNION ALL
    SELECT 1 FROM cnpjs_cadastrados c WHERE c.tenant_id=t.id AND c.monitoramento_ativo=true AND c.tracking_id IS NOT NULL
  )
  ORDER BY
    ((SELECT COUNT(*) FROM processos_oab p WHERE p.tenant_id=t.id AND p.monitoramento_ativo=true AND p.tracking_id IS NOT NULL)
    + (SELECT COUNT(*) FROM cnpjs_cadastrados c WHERE c.tenant_id=t.id AND c.monitoramento_ativo=true AND c.tracking_id IS NOT NULL)) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_migracao_attachments_por_tenant() TO authenticated;