-- Adicionar campos para nova estrutura de credenciais Z-API
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS zapi_instance_id text,
ADD COLUMN IF NOT EXISTS zapi_instance_token text,
ADD COLUMN IF NOT EXISTS zapi_client_token text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Comentários para documentação
COMMENT ON COLUMN public.whatsapp_instances.zapi_instance_id IS 'ID da instância Z-API (ex: 3E8A7687...)';
COMMENT ON COLUMN public.whatsapp_instances.zapi_instance_token IS 'Token da instância Z-API (ex: F5DA3871...)';
COMMENT ON COLUMN public.whatsapp_instances.zapi_client_token IS 'Client-Token opcional para segurança adicional';