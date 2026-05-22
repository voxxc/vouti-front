-- Índice parcial para acelerar contagem/agregação de não lidos
CREATE INDEX IF NOT EXISTS idx_andamentos_nao_lidos_partial
  ON public.processos_oab_andamentos (processo_oab_id, data_movimentacao DESC)
  WHERE lida = false;

-- RPC consolidada: retorna apenas processos com andamentos não lidos
CREATE OR REPLACE FUNCTION public.get_central_andamentos_nao_lidos(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  numero_cnj text,
  parte_ativa text,
  parte_passiva text,
  tribunal_sigla text,
  monitoramento_ativo boolean,
  oab_id uuid,
  andamentos_nao_lidos bigint,
  ultima_movimentacao timestamptz,
  oab_numero text,
  oab_uf text,
  nome_advogado text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.numero_cnj,
    p.parte_ativa,
    p.parte_passiva,
    p.tribunal_sigla,
    p.monitoramento_ativo,
    p.oab_id,
    nl.nao_lidos AS andamentos_nao_lidos,
    nl.ultima_movimentacao,
    o.oab_numero,
    o.oab_uf,
    o.nome_advogado
  FROM public.processos_oab p
  INNER JOIN public.oabs_cadastradas o ON o.id = p.oab_id
  INNER JOIN LATERAL (
    SELECT
      count(*)::bigint AS nao_lidos,
      max(a.data_movimentacao) AS ultima_movimentacao
    FROM public.processos_oab_andamentos a
    WHERE a.processo_oab_id = p.id
      AND a.lida = false
  ) nl ON nl.nao_lidos > 0
  WHERE p.tenant_id = p_tenant_id
  ORDER BY nl.ultima_movimentacao DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_central_andamentos_nao_lidos(uuid) TO authenticated;