-- Backfill request_detalhes
INSERT INTO public.tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT p.tenant_id, 'request_detalhes', p.id, p.detalhes_request_id,
  'Detalhes: ' || COALESCE(p.numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', p.numero_cnj, 'tribunal', p.tribunal, 'origem', 'backfill'),
  COALESCE(p.updated_at, p.created_at, now())
FROM public.processos_oab p
WHERE p.detalhes_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_banco_ids b
    WHERE b.tenant_id = p.tenant_id AND b.tipo = 'request_detalhes' AND b.external_id = p.detalhes_request_id
  );

-- Backfill tracking
INSERT INTO public.tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT p.tenant_id, 'tracking', p.id, p.tracking_id,
  'Monitoramento: ' || COALESCE(p.numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', p.numero_cnj, 'tribunal', p.tribunal, 'monitoramento_ativo', p.monitoramento_ativo, 'origem', 'backfill'),
  COALESCE(p.updated_at, p.created_at, now())
FROM public.processos_oab p
WHERE p.tracking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_banco_ids b
    WHERE b.tenant_id = p.tenant_id AND b.tipo = 'tracking' AND b.external_id = p.tracking_id
  );

-- Backfill request_tracking
INSERT INTO public.tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT p.tenant_id, 'request_tracking', p.id, p.tracking_request_id,
  'Request Tracking: ' || COALESCE(p.numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', p.numero_cnj, 'tracking_id', p.tracking_id, 'origem', 'backfill'),
  COALESCE(p.tracking_request_data, p.updated_at, p.created_at, now())
FROM public.processos_oab p
WHERE p.tracking_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_banco_ids b
    WHERE b.tenant_id = p.tenant_id AND b.tipo = 'request_tracking' AND b.external_id = p.tracking_request_id
  );

-- Índice para acelerar queries do diálogo
CREATE INDEX IF NOT EXISTS idx_tenant_banco_ids_tenant_tipo ON public.tenant_banco_ids (tenant_id, tipo, created_at DESC);