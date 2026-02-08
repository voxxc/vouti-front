-- 1. Corrigir dados existentes: atualizar instância com tenant_id do DEMORAIS
UPDATE whatsapp_instances 
SET tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2'
  AND tenant_id IS NULL;

-- 2. Atualizar mensagens existentes com tenant_id do DEMORAIS
UPDATE whatsapp_messages 
SET tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
WHERE instance_name = '3E8A7687638142678C80FA4754EC29F2'
  AND tenant_id IS NULL;

-- 3. Remover policies antigas de whatsapp_messages baseadas em user_id
DROP POLICY IF EXISTS "Users can view their own WhatsApp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert their own WhatsApp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update their own WhatsApp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete their own WhatsApp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admins can view all WhatsApp messages" ON whatsapp_messages;

-- 4. Criar novas policies baseadas em tenant_id
CREATE POLICY "tenant_select" ON whatsapp_messages
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_insert" ON whatsapp_messages
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_update" ON whatsapp_messages
  FOR UPDATE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_delete" ON whatsapp_messages
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

-- 5. Policy para super admins verem todas as mensagens
CREATE POLICY "superadmin_select" ON whatsapp_messages
  FOR SELECT USING (is_super_admin(auth.uid()));

-- 6. Policy para service role (webhook) inserir mensagens
CREATE POLICY "service_insert" ON whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- 7. Atualizar policies de whatsapp_instances também
DROP POLICY IF EXISTS "Users can view their own WhatsApp instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert their own WhatsApp instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can update their own WhatsApp instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete their own WhatsApp instances" ON whatsapp_instances;

CREATE POLICY "tenant_select" ON whatsapp_instances
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_insert" ON whatsapp_instances
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_update" ON whatsapp_instances
  FOR UPDATE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "tenant_delete" ON whatsapp_instances
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "superadmin_select" ON whatsapp_instances
  FOR SELECT USING (is_super_admin(auth.uid()));