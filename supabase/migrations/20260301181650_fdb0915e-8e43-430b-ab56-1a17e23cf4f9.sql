
DROP FUNCTION IF EXISTS public.get_andamentos_nao_lidos_por_processo(uuid);

CREATE OR REPLACE FUNCTION public.get_andamentos_nao_lidos_por_processo(p_tenant_id uuid)
 RETURNS TABLE(processo_oab_id uuid, nao_lidos integer, ultima_movimentacao timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT a.processo_oab_id, COUNT(*)::integer as nao_lidos, MAX(a.data_movimentacao) as ultima_movimentacao
  FROM processos_oab_andamentos a
  JOIN processos_oab p ON p.id = a.processo_oab_id
  WHERE p.tenant_id = p_tenant_id
    AND a.lida = false
  GROUP BY a.processo_oab_id;
$$;
