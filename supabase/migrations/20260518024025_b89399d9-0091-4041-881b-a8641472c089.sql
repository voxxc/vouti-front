CREATE OR REPLACE FUNCTION public.get_tenant_processos_parados(
  p_tenant_id uuid,
  p_dias integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  numero_cnj text,
  parte_ativa text,
  parte_passiva text,
  oab_id uuid,
  tribunal_sigla text,
  created_at timestamptz,
  ultima_movimentacao timestamptz,
  dias_sem_movimentacao integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ult AS (
    SELECT processo_oab_id, MAX(data_movimentacao) AS ultima
    FROM processos_oab_andamentos
    WHERE tenant_id = p_tenant_id
    GROUP BY processo_oab_id
  )
  SELECT
    p.id,
    p.numero_cnj,
    p.parte_ativa,
    p.parte_passiva,
    p.oab_id,
    p.tribunal_sigla,
    p.created_at,
    u.ultima AS ultima_movimentacao,
    EXTRACT(DAY FROM (now() - COALESCE(u.ultima, p.created_at)))::integer AS dias_sem_movimentacao
  FROM processos_oab p
  LEFT JOIN ult u ON u.processo_oab_id = p.id
  WHERE p.tenant_id = p_tenant_id
    AND p.monitoramento_ativo = true
    AND p.created_at < now() - (p_dias || ' days')::interval
    AND (
      u.ultima IS NULL
      OR u.ultima < now() - (p_dias || ' days')::interval
    )
  ORDER BY COALESCE(u.ultima, p.created_at) ASC
  LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_processos_parados(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_processos_parados(uuid, integer) TO authenticated;