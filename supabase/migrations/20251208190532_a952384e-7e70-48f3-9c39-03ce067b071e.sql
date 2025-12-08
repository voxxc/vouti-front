-- 1. Remover políticas problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can manage roles in tenant" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- 2. Criar função auxiliar para verificar admin no mesmo tenant (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin_in_same_tenant(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN profiles p1 ON p1.user_id = auth.uid()
    JOIN profiles p2 ON p2.user_id = _target_user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND p1.tenant_id = p2.tenant_id
  )
$$;

-- 3. Criar novas políticas sem recursão

-- SELECT: Usuários podem ver seus próprios roles (já existe, mas garantir)
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Admins podem inserir roles para usuários do mesmo tenant
CREATE POLICY "Admins can insert roles in tenant"
ON user_roles FOR INSERT TO authenticated
WITH CHECK (is_admin_in_same_tenant(user_id));

-- UPDATE: Admins podem atualizar roles de usuários do mesmo tenant
CREATE POLICY "Admins can update roles in tenant"
ON user_roles FOR UPDATE TO authenticated
USING (is_admin_in_same_tenant(user_id));

-- DELETE: Admins podem deletar roles de usuários do mesmo tenant
CREATE POLICY "Admins can delete roles in tenant"
ON user_roles FOR DELETE TO authenticated
USING (is_admin_in_same_tenant(user_id));