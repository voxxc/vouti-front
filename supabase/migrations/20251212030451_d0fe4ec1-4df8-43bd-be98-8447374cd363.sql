-- ============================================
-- FASE 1: Corrigir roles com tenant_id NULL
-- ============================================

-- Atualizar todas as roles que estão com tenant_id NULL
-- baseando-se no tenant_id do profile do usuário
UPDATE public.user_roles ur
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- Deletar roles órfãs (usuários sem profile com tenant ou roles sem profile)
-- Estas são roles inválidas que não pertencem a nenhum tenant
DELETE FROM public.user_roles
WHERE tenant_id IS NULL;

-- ============================================
-- FASE 2: Corrigir função SECURITY DEFINER
-- ============================================

-- Função para verificar se usuário atual é admin no mesmo tenant do usuário alvo
-- SECURITY DEFINER evita recursão RLS
CREATE OR REPLACE FUNCTION public.is_admin_in_same_tenant(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p1 ON p1.user_id = auth.uid()
    JOIN public.profiles p2 ON p2.user_id = _target_user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.tenant_id = p1.tenant_id
      AND p1.tenant_id = p2.tenant_id
  )
$$;

-- ============================================
-- FASE 3: Limpar e recriar políticas RLS
-- ============================================

-- Remover TODAS as políticas existentes da tabela user_roles
DROP POLICY IF EXISTS "Admins can manage roles in same tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles in their tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in same tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in tenant" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_update" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_tenant_delete" ON public.user_roles;

-- Recriar com padrão simplificado de 4 políticas

-- SELECT: Usuários podem ver roles do seu tenant
CREATE POLICY "user_roles_tenant_select" ON public.user_roles
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );

-- INSERT: Apenas admins do tenant podem inserir roles
CREATE POLICY "user_roles_tenant_insert" ON public.user_roles
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND is_current_user_admin_in_tenant(tenant_id)
  );

-- UPDATE: Apenas admins podem atualizar roles de usuários do mesmo tenant
CREATE POLICY "user_roles_tenant_update" ON public.user_roles
  FOR UPDATE USING (
    tenant_id IS NOT NULL 
    AND is_admin_in_same_tenant(user_id)
  );

-- DELETE: Apenas admins podem deletar roles de usuários do mesmo tenant
CREATE POLICY "user_roles_tenant_delete" ON public.user_roles
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND is_admin_in_same_tenant(user_id)
  );

-- ============================================
-- FASE 4: Adicionar constraint NOT NULL
-- ============================================

-- Garantir que tenant_id nunca seja NULL no futuro
ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL;