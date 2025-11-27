-- Corrigir políticas RLS da tabela super_admins

-- 1. Remover política problemática que causa o ciclo impossível
DROP POLICY IF EXISTS "Super admins can manage super_admins" ON public.super_admins;
DROP POLICY IF EXISTS "Allow first super admin registration or existing admins" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can update and delete" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can delete" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can view" ON public.super_admins;

-- 2. Política para SELECT (apenas super admins podem ver)
CREATE POLICY "Super admins can view"
  ON public.super_admins FOR SELECT
  USING (is_super_admin(auth.uid()));

-- 3. Política para INSERT (permite bootstrap OU super admin existente)
CREATE POLICY "Allow first super admin or existing admins to insert"
  ON public.super_admins FOR INSERT
  WITH CHECK (
    -- Permitir se não existir nenhum super admin ainda (bootstrap)
    NOT EXISTS (SELECT 1 FROM public.super_admins)
    OR
    -- Ou se o usuário já for super admin
    is_super_admin(auth.uid())
  );

-- 4. Política para UPDATE (apenas super admins)
CREATE POLICY "Super admins can update"
  ON public.super_admins FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- 5. Política para DELETE (apenas super admins)
CREATE POLICY "Super admins can delete"
  ON public.super_admins FOR DELETE
  USING (is_super_admin(auth.uid()));

-- 6. Registrar o usuário existente como Super Admin
INSERT INTO public.super_admins (user_id, email)
VALUES ('02824d5e-8c9d-4599-83ce-f3ef7f6be674', 'danieldemorais@vouti.co')
ON CONFLICT (user_id) DO NOTHING;