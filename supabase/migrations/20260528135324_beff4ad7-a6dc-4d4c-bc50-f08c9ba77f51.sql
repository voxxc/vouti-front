
CREATE OR REPLACE FUNCTION public.get_tenant_processos_sigilosos(p_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  numero_cnj text,
  parte_ativa text,
  parte_passiva text,
  oab_id uuid,
  tribunal_sigla text,
  secrecy_level integer,
  monitoramento_ativo boolean,
  ultima_atualizacao_detalhes timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.numero_cnj,
    p.parte_ativa,
    p.parte_passiva,
    p.oab_id,
    p.tribunal_sigla,
    COALESCE(NULLIF(p.capa_completa::jsonb->>'secrecy_level','')::int, 0) AS secrecy_level,
    p.monitoramento_ativo,
    p.ultima_atualizacao_detalhes,
    p.created_at
  FROM processos_oab p
  WHERE p.tenant_id = p_tenant_id
    AND public.is_super_admin(auth.uid())
    AND COALESCE(NULLIF(p.capa_completa::jsonb->>'secrecy_level','')::int, 0) > 0
  ORDER BY COALESCE(NULLIF(p.capa_completa::jsonb->>'secrecy_level','')::int, 0) DESC,
           p.ultima_atualizacao_detalhes DESC NULLS LAST
  LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_processos_sigilosos(uuid) TO authenticated;
