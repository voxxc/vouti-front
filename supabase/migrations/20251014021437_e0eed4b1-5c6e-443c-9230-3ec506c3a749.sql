-- Adicionar campos para armazenar config Z-API
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS zapi_url TEXT,
ADD COLUMN IF NOT EXISTS zapi_token TEXT;

-- Atualizar instância existente com config Z-API
UPDATE whatsapp_instances
SET 
  zapi_url = 'https://api.z-api.io/instances/3E8A7687638142678C80FA4754EC29F2/token/F5DA3871D271E4965BD44484',
  zapi_token = 'F5DA3871D271E4965BD44484'
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2';

-- Corrigir instance_name das automações para usar o ID real do Z-API
UPDATE whatsapp_automations
SET instance_name = '3E8A7687638142678C80FA4754EC29F2'
WHERE instance_name = 'whatsapp-bot';