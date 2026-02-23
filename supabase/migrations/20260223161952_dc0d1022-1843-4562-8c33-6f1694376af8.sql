
-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_andamentos_processo_lida_unread
ON public.processos_oab_andamentos (processo_oab_id)
WHERE lida = false;

-- Function: get total unread count for a tenant
CREATE OR REPLACE FUNCTION public.get_total_andamentos_nao_lidos(p_tenant_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM processos_oab_andamentos a
  JOIN processos_oab p ON p.id = a.processo_oab_id
  WHERE p.tenant_id = p_tenant_id
    AND a.lida = false;
$$;

-- Function: get unread count per processo for a tenant
CREATE OR REPLACE FUNCTION public.get_andamentos_nao_lidos_por_processo(p_tenant_id uuid)
RETURNS TABLE(processo_oab_id uuid, nao_lidos integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.processo_oab_id, COUNT(*)::integer as nao_lidos
  FROM processos_oab_andamentos a
  JOIN processos_oab p ON p.id = a.processo_oab_id
  WHERE p.tenant_id = p_tenant_id
    AND a.lida = false
  GROUP BY a.processo_oab_id;
$$;
