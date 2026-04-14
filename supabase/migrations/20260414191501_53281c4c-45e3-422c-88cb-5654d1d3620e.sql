
-- Adicionar coluna created_by
ALTER TABLE public.credenciais_cliente
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Preencher registros existentes com enviado_por onde disponível
UPDATE public.credenciais_cliente
SET created_by = enviado_por
WHERE enviado_por IS NOT NULL AND created_by IS NULL;

-- Remover políticas SELECT existentes
DROP POLICY IF EXISTS "Tenants can view their credentials" ON public.credenciais_cliente;
DROP POLICY IF EXISTS "credenciais_select_restrito" ON public.credenciais_cliente;
DROP POLICY IF EXISTS "Super admins can view all credentials" ON public.credenciais_cliente;

-- Nova política SELECT restrita
CREATE POLICY "credenciais_select_restrito" ON public.credenciais_cliente
FOR SELECT USING (
  (
    tenant_id = get_user_tenant_id()
    AND (
      created_by = auth.uid()
      OR is_admin_or_controller_in_tenant()
    )
  )
  OR is_super_admin(auth.uid())
);
