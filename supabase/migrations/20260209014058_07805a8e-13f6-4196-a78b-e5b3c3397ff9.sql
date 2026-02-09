-- Remove orphan instance without tenant
DELETE FROM whatsapp_instances 
WHERE instance_name = '3E9FB06B7411D139EDBECA3E99AAFF93' 
  AND tenant_id IS NULL;