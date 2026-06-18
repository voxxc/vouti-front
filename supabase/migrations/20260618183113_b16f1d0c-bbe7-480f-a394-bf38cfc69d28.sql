ALTER TABLE public.deadline_subtarefas ADD COLUMN IF NOT EXISTS comentario_conclusao text;

CREATE OR REPLACE FUNCTION public.get_central_subtarefas(
  p_tenant_id uuid,
  p_dias integer DEFAULT 90,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT DISTINCT d.*
    FROM public.deadlines d
    INNER JOIN public.deadline_subtarefas s ON s.deadline_id = d.id
    WHERE d.tenant_id = p_tenant_id
      AND d.completed = true
      AND d.concluido_em >= (now() - (p_dias || ' days')::interval)
      AND (
        p_user_id IS NULL
        OR d.advogado_responsavel_id = p_user_id
        OR d.concluido_por = p_user_id
      )
  ),
  subs AS (
    SELECT
      s.deadline_id,
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'descricao', s.descricao,
          'concluida', s.concluida,
          'concluida_em', s.concluida_em,
          'comentario_conclusao', s.comentario_conclusao,
          'created_at', s.created_at,
          'atribuido_a_profile', CASE WHEN pa.user_id IS NOT NULL THEN
            jsonb_build_object('user_id', pa.user_id, 'full_name', pa.full_name, 'avatar_url', pa.avatar_url)
          ELSE NULL END,
          'criado_por_profile', CASE WHEN pc.user_id IS NOT NULL THEN
            jsonb_build_object('user_id', pc.user_id, 'full_name', pc.full_name, 'avatar_url', pc.avatar_url)
          ELSE NULL END
        )
        ORDER BY s.created_at
      ) AS subtarefas
    FROM public.deadline_subtarefas s
    LEFT JOIN public.profiles pa ON pa.user_id = s.atribuido_a
    LEFT JOIN public.profiles pc ON pc.user_id = s.criado_por
    WHERE s.deadline_id IN (SELECT id FROM base)
    GROUP BY s.deadline_id
  )
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.concluido_em DESC NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT
      b.id, b.title, b.description, b.date, b.comentario_conclusao, b.concluido_em,
      b.protocolo_etapa_id, b.project_id, b.workspace_id, b.processo_oab_id,
      CASE WHEN pa.user_id IS NOT NULL THEN
        jsonb_build_object('user_id', pa.user_id, 'full_name', pa.full_name, 'avatar_url', pa.avatar_url)
      ELSE NULL END AS advogado,
      CASE WHEN pc.user_id IS NOT NULL THEN
        jsonb_build_object('user_id', pc.user_id, 'full_name', pc.full_name, 'avatar_url', pc.avatar_url)
      ELSE NULL END AS concluido_por_profile,
      CASE WHEN pcr.user_id IS NOT NULL THEN
        jsonb_build_object('user_id', pcr.user_id, 'full_name', pcr.full_name, 'avatar_url', pcr.avatar_url)
      ELSE NULL END AS criador_profile,
      CASE WHEN pr.id IS NOT NULL THEN
        jsonb_build_object('id', pr.id, 'name', pr.name, 'client', pr.client)
      ELSE NULL END AS projects,
      CASE WHEN pe.id IS NOT NULL THEN
        jsonb_build_object(
          'id', pe.id,
          'nome', pe.nome,
          'protocolo', CASE WHEN pp.id IS NOT NULL THEN
            jsonb_build_object('id', pp.id, 'nome', pp.nome)
          ELSE NULL END
        )
      ELSE NULL END AS protocolo_etapa,
      COALESCE(sb.subtarefas, '[]'::jsonb) AS subtarefas
    FROM base b
    LEFT JOIN public.profiles pa ON pa.user_id = b.advogado_responsavel_id
    LEFT JOIN public.profiles pc ON pc.user_id = b.concluido_por
    LEFT JOIN public.profiles pcr ON pcr.user_id = b.user_id
    LEFT JOIN public.projects pr ON pr.id = b.project_id
    LEFT JOIN public.project_protocolo_etapas pe ON pe.id = b.protocolo_etapa_id
    LEFT JOIN public.project_protocolos pp ON pp.id = pe.protocolo_id
    LEFT JOIN subs sb ON sb.deadline_id = b.id
  ) t
$$;

GRANT EXECUTE ON FUNCTION public.get_central_subtarefas(uuid, integer, uuid) TO authenticated;