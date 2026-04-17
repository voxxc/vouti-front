-- RPC 1: Contagem de processos incompletos agrupados por tenant
CREATE OR REPLACE FUNCTION public.get_incomplete_processos_count_by_tenant()
RETURNS TABLE(tenant_id uuid, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT p.tenant_id, COUNT(*)::bigint
    FROM public.processos_oab p
    WHERE p.detalhes_request_id IS NULL
      AND p.numero_cnj IS NOT NULL
      AND p.tenant_id IS NOT NULL
    GROUP BY p.tenant_id;
  ELSE
    RETURN QUERY
    SELECT p.tenant_id, COUNT(*)::bigint
    FROM public.processos_oab p
    WHERE p.detalhes_request_id IS NULL
      AND p.numero_cnj IS NOT NULL
      AND p.tenant_id = public.get_user_tenant_id()
    GROUP BY p.tenant_id;
  END IF;
END;
$$;

-- RPC 2: Lista detalhada de processos incompletos de um tenant específico
CREATE OR REPLACE FUNCTION public.get_incomplete_processos_by_tenant(p_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  numero_cnj text,
  created_at timestamptz,
  monitoramento_ativo boolean,
  oab_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permite super admin OU usuário do próprio tenant
  IF NOT public.is_super_admin(auth.uid())
     AND public.get_user_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT p.id, p.numero_cnj, p.created_at, p.monitoramento_ativo, p.oab_id
  FROM public.processos_oab p
  WHERE p.tenant_id = p_tenant_id
    AND p.detalhes_request_id IS NULL
    AND p.numero_cnj IS NOT NULL
  ORDER BY p.created_at DESC;
END;
$$;