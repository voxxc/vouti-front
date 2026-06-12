CREATE OR REPLACE FUNCTION public.get_public_processos_com_anexos()
RETURNS TABLE (
  processo_oab_id uuid,
  numero_cnj text,
  tribunal text,
  tribunal_sigla text,
  oab_numero text,
  oab_uf text,
  tenant_nome text,
  total_anexos bigint,
  ultimo_anexo_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS processo_oab_id,
    p.numero_cnj,
    p.tribunal,
    p.tribunal_sigla,
    o.oab_numero,
    o.oab_uf,
    t.name AS tenant_nome,
    COUNT(a.id) AS total_anexos,
    MAX(a.created_at) AS ultimo_anexo_em
  FROM public.processos_oab_anexos a
  JOIN public.processos_oab p ON p.id = a.processo_oab_id
  LEFT JOIN public.oabs_cadastradas o ON o.id = p.oab_id
  LEFT JOIN public.tenants t ON t.id = p.tenant_id
  WHERE a.status = 'done'
    AND COALESCE(a.is_private, false) = false
    AND COALESCE(a.attachment_name, '') NOT ILIKE '%Restrição na Visualização%'
  GROUP BY p.id, p.numero_cnj, p.tribunal, p.tribunal_sigla, o.oab_numero, o.oab_uf, t.name
  ORDER BY MAX(a.created_at) DESC NULLS LAST
  LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_processos_com_anexos() TO anon, authenticated;