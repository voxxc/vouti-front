
-- Etapa 1: Adicionar colunas de provider e credenciais Meta na whatsapp_instances
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'zapi',
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_waba_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_business_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_verify_token TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.whatsapp_instances.provider IS 'Provider de WhatsApp: zapi ou meta';
COMMENT ON COLUMN public.whatsapp_instances.meta_phone_number_id IS 'Phone Number ID do Meta WhatsApp Cloud API';
COMMENT ON COLUMN public.whatsapp_instances.meta_access_token IS 'Access Token permanente do Meta';
COMMENT ON COLUMN public.whatsapp_instances.meta_waba_id IS 'WhatsApp Business Account ID';
COMMENT ON COLUMN public.whatsapp_instances.meta_verify_token IS 'Token para verificação do webhook Meta';
