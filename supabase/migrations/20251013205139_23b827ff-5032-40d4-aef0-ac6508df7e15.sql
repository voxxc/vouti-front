-- Adicionar índice único em instance_name para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_instance_name_key 
ON whatsapp_instances(instance_name);