-- Super Admin pode gerenciar mensagens sem tenant (homepage leads)
CREATE POLICY "Super admins can manage whatsapp messages without tenant"
ON whatsapp_messages FOR ALL
USING (
  tenant_id IS NULL AND is_super_admin(auth.uid())
)
WITH CHECK (
  tenant_id IS NULL AND is_super_admin(auth.uid())
);