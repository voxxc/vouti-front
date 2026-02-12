
-- Correção retroativa: vincular mensagens existentes do tenant /demorais à agente Juliana
-- As mensagens foram recebidas pela instância antiga (3E8A7687...) que está desconectada
-- A Juliana (acef3363...) é a agente ativa, então vinculamos a ela
UPDATE whatsapp_messages
SET agent_id = 'acef3363-ddf4-4e4e-b882-eb3f2a1a77fb'
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND agent_id IS NULL;
