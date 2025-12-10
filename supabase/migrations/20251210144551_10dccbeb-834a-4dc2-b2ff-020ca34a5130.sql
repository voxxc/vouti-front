-- ============================================
-- CORREÇÃO: Recursão Infinita em profiles
-- ============================================

-- Fase 1: Remover TODAS as políticas problemáticas (incluindo duplicatas)
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Fase 2: Recriar políticas SEM recursão (usando get_user_tenant_id() que é SECURITY DEFINER)

-- Política 1: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

-- Política 2: Usuários podem ver perfis do mesmo tenant (SEM RECURSÃO)
CREATE POLICY "Users can view profiles in same tenant" ON public.profiles
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
  );