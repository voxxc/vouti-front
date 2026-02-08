-- Tabela de contatos com IA desabilitada
CREATE TABLE public.whatsapp_ai_disabled_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  disabled_by uuid REFERENCES auth.users(id),
  disabled_at timestamptz DEFAULT now(),
  reason text,
  
  UNIQUE(tenant_id, phone_number)
);

-- Índice para buscas rápidas
CREATE INDEX idx_whatsapp_ai_disabled_phone ON whatsapp_ai_disabled_contacts(phone_number);
CREATE INDEX idx_whatsapp_ai_disabled_tenant ON whatsapp_ai_disabled_contacts(tenant_id);

-- RLS
ALTER TABLE whatsapp_ai_disabled_contacts ENABLE ROW LEVEL SECURITY;

-- Tenant pode gerenciar seus contatos
CREATE POLICY "tenant_manage_disabled_contacts"
ON whatsapp_ai_disabled_contacts FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Super Admin (tenant NULL)
CREATE POLICY "superadmin_manage_disabled_contacts"
ON whatsapp_ai_disabled_contacts FOR ALL
USING (tenant_id IS NULL AND is_super_admin(auth.uid()))
WITH CHECK (tenant_id IS NULL AND is_super_admin(auth.uid()));