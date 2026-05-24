CREATE OR REPLACE FUNCTION public.get_tenant_trackings_live(p_tenant_id uuid)
RETURNS TABLE (
  processo_id uuid,
  numero_cnj text,
  tribunal text,
  tracking_id text,
  monitoramento_ativo boolean,
  updated_at timestamptz,
  source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.numero_cnj, p.tribunal_sigla, p.tracking_id, COALESCE(p.monitoramento_ativo, false), p.updated_at, 'oab'::text
  FROM public.processos_oab p
  WHERE p.tenant_id = p_tenant_id
    AND p.tracking_id IS NOT NULL
    AND (public.is_super_admin(auth.uid()) OR p.tenant_id = public.get_user_tenant_id())
  UNION ALL
  SELECT c.id, c.cnpj, NULL::text, c.tracking_id, COALESCE(c.monitoramento_ativo, false), c.updated_at, 'cnpj'::text
  FROM public.cnpjs_cadastrados c
  WHERE c.tenant_id = p_tenant_id
    AND c.tracking_id IS NOT NULL
    AND (public.is_super_admin(auth.uid()) OR c.tenant_id = public.get_user_tenant_id());
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_trackings_live(uuid) TO authenticated;