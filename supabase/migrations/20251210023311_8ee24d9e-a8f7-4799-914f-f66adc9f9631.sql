-- =====================================================
-- FASE 20: Corrigir dados orfaos - Associar tenant_id baseado em user_id
-- =====================================================

-- Tasks sem tenant_id - usar project para herdar tenant_id
UPDATE tasks 
SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = tasks.project_id LIMIT 1)
WHERE tenant_id IS NULL AND project_id IS NOT NULL;

-- Atualizar profiles para garantir que admin veja apenas profiles do mesmo tenant
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view profiles in tenant" ON profiles
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Atualizar user_roles para garantir isolamento por tenant
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;

CREATE POLICY "Admins can manage roles in same tenant" ON user_roles
FOR ALL USING (
  is_admin_in_same_tenant(user_id)
);