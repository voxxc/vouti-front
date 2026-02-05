-- Remover constraint atual
ALTER TABLE tenant_banco_ids 
DROP CONSTRAINT IF EXISTS tenant_banco_ids_tipo_check;

-- Adicionar constraint atualizada com tracking_desativado
ALTER TABLE tenant_banco_ids 
ADD CONSTRAINT tenant_banco_ids_tipo_check 
CHECK (tipo = ANY (ARRAY[
  'oab'::text, 
  'processo'::text, 
  'tracking'::text, 
  'tracking_desativado'::text,
  'request_busca'::text, 
  'request_detalhes'::text, 
  'request_monitoramento'::text
]));