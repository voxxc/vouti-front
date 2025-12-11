-- Corrigir RLS policies da tabela notifications para multi-tenant

-- Remover policies existentes que podem estar conflitantes ou permissivas
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can create tenant notifications" ON notifications;
DROP POLICY IF EXISTS "tenant_select" ON notifications;
DROP POLICY IF EXISTS "tenant_insert" ON notifications;
DROP POLICY IF EXISTS "tenant_update" ON notifications;
DROP POLICY IF EXISTS "tenant_delete" ON notifications;

-- Policy de SELECT: usuário só vê notificações do próprio tenant E do próprio user_id
CREATE POLICY "tenant_select" ON notifications
FOR SELECT USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
  AND user_id = auth.uid()
);

-- Policy de INSERT: permite inserção com tenant_id correto (service role bypass RLS)
CREATE POLICY "tenant_insert" ON notifications
FOR INSERT WITH CHECK (
  tenant_id IS NOT NULL
);

-- Policy de UPDATE: usuário só atualiza próprias notificações no tenant
CREATE POLICY "tenant_update" ON notifications
FOR UPDATE USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
  AND user_id = auth.uid()
);

-- Policy de DELETE: usuário só deleta próprias notificações no tenant
CREATE POLICY "tenant_delete" ON notifications
FOR DELETE USING (
  tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
  AND user_id = auth.uid()
);