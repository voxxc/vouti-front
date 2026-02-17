
-- 1. Add tenant_id to whatsapp_contact_labels
ALTER TABLE whatsapp_contact_labels 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- 2. Add transfer tracking columns to whatsapp_conversation_kanban
ALTER TABLE whatsapp_conversation_kanban 
  ADD COLUMN IF NOT EXISTS transferred_from_agent_id uuid REFERENCES whatsapp_agents(id),
  ADD COLUMN IF NOT EXISTS transferred_from_agent_name text;

-- 3. RLS policy for whatsapp_contact_labels tenant isolation
CREATE POLICY "Users can manage contact labels in their tenant"
  ON whatsapp_contact_labels
  FOR ALL
  USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL)
  WITH CHECK (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);
