-- Extrair andamentos de detalhes_completos para os 8 processos
-- Usando INSERT ... ON CONFLICT para evitar duplicatas

INSERT INTO processos_oab_andamentos (processo_oab_id, tenant_id, data_movimentacao, tipo_movimentacao, descricao, dados_completos, lida)
SELECT 
  po.id as processo_oab_id,
  po.tenant_id,
  (step->>'step_date')::timestamptz as data_movimentacao,
  step->>'type' as tipo_movimentacao,
  step->>'content' as descricao,
  step as dados_completos,
  false as lida
FROM processos_oab po
CROSS JOIN LATERAL jsonb_array_elements(po.detalhes_completos->'steps') as step
WHERE po.numero_cnj IN (
  '5001827-89.2025.8.21.0109',
  '5011796-05.2025.4.04.7104',
  '5001012-66.2025.4.04.7104',
  '5023126-56.2024.8.21.0013',
  '0002322-81.2024.8.16.0114',
  '0002391-16.2024.8.16.0114',
  '0001172-31.2025.8.16.0114',
  '0000284-62.2025.8.16.0114'
)
AND po.detalhes_completos->'steps' IS NOT NULL
AND step->>'content' IS NOT NULL
AND step->>'content' != ''
ON CONFLICT (processo_oab_id, truncate_minute(data_movimentacao), normalize_descricao(descricao)) 
DO NOTHING;