-- Remover política permissiva que expõe tenants publicamente
DROP POLICY IF EXISTS "Anyone can view active tenants" ON public.tenants;

-- Criar políticas restritivas
-- Super admins podem ver todos os tenants
CREATE POLICY "Super admins can view all tenants"
ON public.tenants
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Usuários autenticados só podem ver seu próprio tenant
CREATE POLICY "Users can view their own tenant"
ON public.tenants
FOR SELECT
USING (id = get_user_tenant_id());