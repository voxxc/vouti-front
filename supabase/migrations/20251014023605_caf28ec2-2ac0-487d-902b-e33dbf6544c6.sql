-- Atualizar credenciais Z-API corretas
UPDATE whatsapp_instances
SET 
  zapi_url = 'https://api.z-api.io/instances/3E8A7687638142678C80FA4754EC29F2',
  zapi_token = 'F5DA3871D271E4965BD44484',
  last_update = now()
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2';

-- Limpar automações duplicadas com instance_name vazio
DELETE FROM whatsapp_automations 
WHERE instance_name IS NULL OR instance_name = '';