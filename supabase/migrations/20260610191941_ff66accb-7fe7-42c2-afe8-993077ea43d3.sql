
ALTER TABLE public.processos_oab
  ADD COLUMN IF NOT EXISTS apartado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apartado_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS apartado_por UUID NULL;

CREATE INDEX IF NOT EXISTS idx_processos_oab_apartado
  ON public.processos_oab (tenant_id)
  WHERE apartado = true;

CREATE OR REPLACE FUNCTION public.can_use_apartados(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = '8eda80fa-0319-4791-923e-551052282e62'::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.can_use_apartados(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_central_andamentos_nao_lidos(uuid);

CREATE FUNCTION public.get_central_andamentos_nao_lidos(p_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  numero_cnj text,
  parte_ativa text,
  parte_passiva text,
  tribunal_sigla text,
  monitoramento_ativo boolean,
  oab_id uuid,
  andamentos_nao_lidos bigint,
  ultima_movimentacao timestamp with time zone,
  oab_numero text,
  oab_uf text,
  nome_advogado text,
  apartado boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    o.nome_advogado,
    COALESCE(p.apartado, false) AS apartado
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
$function$;
