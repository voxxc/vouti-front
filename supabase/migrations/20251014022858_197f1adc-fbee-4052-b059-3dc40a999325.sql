-- Atualizar token Z-API usando a Secret do Supabase
UPDATE whatsapp_instances
SET 
  zapi_url = 'https://api.z-api.io/instances/3E8A7687638142678C80FA4754EC29F2',
  zapi_token = (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'Z_API_TOKEN' LIMIT 1)
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2';