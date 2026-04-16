INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  p.tenant_id,
  'request_detalhes',
  p.id,
  p.detalhes_request_id,
  'Detalhes: ' || COALESCE(p.numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', p.numero_cnj)
FROM processos_oab p
WHERE p.tenant_id = '272d9707-53b8-498d-bcc1-ea074b6c8c71'
  AND p.detalhes_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids b
    WHERE b.tenant_id = p.tenant_id
      AND b.tipo = 'request_detalhes'
      AND b.external_id = p.detalhes_request_id
  );