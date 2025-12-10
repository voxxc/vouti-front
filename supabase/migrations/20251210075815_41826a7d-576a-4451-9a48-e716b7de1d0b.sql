-- Remover política RLS problemática que permite vazamento entre tenants
DROP POLICY IF EXISTS "Project members can view collaborator profiles" ON public.profiles;

-- Garantir que a política de visualização de perfis do mesmo tenant está correta
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON public.profiles;
CREATE POLICY "Users can view profiles in same tenant" 
ON public.profiles 
FOR SELECT 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Garantir que usuários só podem ver seu próprio perfil OU perfis do mesmo tenant
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());