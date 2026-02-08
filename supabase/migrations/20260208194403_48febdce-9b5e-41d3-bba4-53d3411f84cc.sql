-- Criar política RLS para permitir admins do tenant atualizarem settings
CREATE POLICY "Tenant admins can update own tenant settings"
ON tenants
FOR UPDATE
TO authenticated
USING (
  id = get_user_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND tenant_id = id 
    AND role = 'admin'
  )
)
WITH CHECK (
  id = get_user_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND tenant_id = id 
    AND role = 'admin'
  )
);