-- Remover a constraint UNIQUE antiga (não o índice)
ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_instance_name_key;

-- Criar índice UNIQUE para instâncias com tenant
CREATE UNIQUE INDEX whatsapp_instances_tenant_instance_name_key 
ON public.whatsapp_instances (tenant_id, instance_name) 
WHERE tenant_id IS NOT NULL;

-- Criar índice UNIQUE para instâncias do Super Admin (tenant_id NULL)
CREATE UNIQUE INDEX whatsapp_instances_superadmin_instance_name_key 
ON public.whatsapp_instances (agent_id, instance_name) 
WHERE tenant_id IS NULL;