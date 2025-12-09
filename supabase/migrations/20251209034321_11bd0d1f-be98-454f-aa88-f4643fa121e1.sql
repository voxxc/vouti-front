-- Insert retroactive log for OAB synchronization that happened before logging was implemented
INSERT INTO judit_api_logs (
  tenant_id, 
  oab_id, 
  tipo_chamada, 
  endpoint, 
  metodo, 
  sucesso, 
  resposta_status,
  created_at
)
SELECT 
  oc.tenant_id,
  oc.id as oab_id,
  'request-document' as tipo_chamada,
  'https://requests.prod.judit.io/requests' as endpoint,
  'POST' as metodo,
  true as sucesso,
  200 as resposta_status,
  oc.ultima_sincronizacao as created_at
FROM oabs_cadastradas oc
WHERE oc.ultima_sincronizacao IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM judit_api_logs jal 
    WHERE jal.oab_id = oc.id 
    AND jal.tipo_chamada = 'request-document'
  );