UPDATE public.publicacoes
SET status = 'nao_tratada',
    tipo = CASE WHEN tipo ILIKE 'Decis%(teste)%' THEN 'Decisão'
                WHEN tipo ILIKE 'Publica%(teste)%' THEN 'Publicação'
                ELSE tipo END,
    diario_sigla = COALESCE(diario_sigla, 'JUDIT'),
    diario_nome = COALESCE(diario_nome, 'Monitoramento Judit')
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND origem = 'monitoramento_processo'
  AND status = 'nao_lida';