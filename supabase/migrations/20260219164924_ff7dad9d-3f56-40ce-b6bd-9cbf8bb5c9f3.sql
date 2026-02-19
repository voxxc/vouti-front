-- Corrigir mensagens mal-roteadas: atribuir agent_id correto baseado na instância
UPDATE whatsapp_messages m
SET agent_id = wi.agent_id
FROM whatsapp_instances wi
WHERE wi.zapi_instance_id = m.instance_name
  AND m.agent_id IS NOT NULL
  AND wi.agent_id IS NOT NULL
  AND m.agent_id != wi.agent_id
  AND m.tenant_id IS NOT NULL;