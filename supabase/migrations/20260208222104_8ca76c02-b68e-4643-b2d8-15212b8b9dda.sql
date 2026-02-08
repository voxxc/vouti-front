-- Tabela de configuração de IA por tenant
CREATE TABLE public.whatsapp_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  instance_name text,
  is_enabled boolean DEFAULT false,
  agent_name text DEFAULT 'Assistente',
  system_prompt text DEFAULT 'Você é um assistente virtual prestativo. Responda de forma amigável e profissional. Limite suas respostas a 300 caracteres.',
  model_name text DEFAULT 'google/gemini-3-flash-preview',
  temperature float DEFAULT 0.7,
  max_history int DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_ai_config_updated_at
  BEFORE UPDATE ON whatsapp_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE whatsapp_ai_config ENABLE ROW LEVEL SECURITY;

-- Tenant pode gerenciar sua própria config
CREATE POLICY "tenant_manage_ai_config"
ON whatsapp_ai_config FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Super Admin pode gerenciar config sem tenant
CREATE POLICY "superadmin_manage_ai_config"
ON whatsapp_ai_config FOR ALL
USING (tenant_id IS NULL AND is_super_admin(auth.uid()))
WITH CHECK (tenant_id IS NULL AND is_super_admin(auth.uid()));