CREATE OR REPLACE FUNCTION public.get_auditoria_cobertura_tenant(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_authorized boolean;
  v_vinculos int;
  v_cnjs_unicos int;
  v_linhas_auditoria int;
  v_duplicados jsonb;
  v_orfaos jsonb;
  v_sem_cobertura jsonb;
BEGIN
  SELECT public.is_super_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_support = true)
    INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Apenas super-admin ou suporte podem acessar esta auditoria';
  END IF;

  SELECT COUNT(*) INTO v_vinculos
  FROM public.processos_oab
  WHERE tenant_id = p_tenant_id
    AND monitoramento_ativo = true
    AND with_attachments = true;

  SELECT COUNT(DISTINCT numero_cnj) INTO v_cnjs_unicos
  FROM public.processos_oab
  WHERE tenant_id = p_tenant_id
    AND monitoramento_ativo = true
    AND with_attachments = true;

  SELECT COUNT(*) INTO v_linhas_auditoria
  FROM public.judit_migracao_attachments
  WHERE tenant_id = p_tenant_id
    AND status = 'migrado';

  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'ocorrencias' DESC), '[]'::jsonb) INTO v_duplicados
  FROM (
    SELECT jsonb_build_object(
      'numero_cnj', numero_cnj,
      'ocorrencias', COUNT(*),
      'tentativas', jsonb_agg(jsonb_build_object(
        'id', id,
        'status', status,
        'tracking_id_antigo', tracking_id_antigo,
        'tracking_id_novo', tracking_id_novo,
        'antigo_pausado', antigo_pausado,
        'pausa_erro', pausa_erro,
        'erro', erro,
        'executado_em', executado_em
      ) ORDER BY executado_em)
    ) AS d
    FROM public.judit_migracao_attachments
    WHERE tenant_id = p_tenant_id
      AND numero_cnj IS NOT NULL
    GROUP BY numero_cnj
    HAVING COUNT(*) > 1
  ) sub;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'processo_id', po.id,
    'numero_cnj', po.numero_cnj,
    'tracking_id', po.tracking_id,
    'oab_id', po.oab_id
  )), '[]'::jsonb) INTO v_orfaos
  FROM public.processos_oab po
  WHERE po.tenant_id = p_tenant_id
    AND po.monitoramento_ativo = true
    AND po.with_attachments = true
    AND NOT EXISTS (
      SELECT 1 FROM public.judit_migracao_attachments j
      WHERE j.tenant_id = p_tenant_id
        AND j.status = 'migrado'
        AND j.numero_cnj = po.numero_cnj
    );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'processo_id', po.id,
    'numero_cnj', po.numero_cnj,
    'tracking_id', po.tracking_id,
    'oab_id', po.oab_id
  )), '[]'::jsonb) INTO v_sem_cobertura
  FROM public.processos_oab po
  WHERE po.tenant_id = p_tenant_id
    AND po.monitoramento_ativo = true
    AND po.with_attachments = false
    AND po.tracking_id IS NOT NULL;

  RETURN jsonb_build_object(
    'vinculos_com_anexo', v_vinculos,
    'cnjs_unicos_com_anexo', v_cnjs_unicos,
    'linhas_auditoria', v_linhas_auditoria,
    'diferenca', v_linhas_auditoria - v_cnjs_unicos,
    'duplicados', v_duplicados,
    'orfaos', v_orfaos,
    'sem_cobertura', v_sem_cobertura
  );
END;
$$;