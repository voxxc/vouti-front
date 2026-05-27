CREATE POLICY "Tenant roles podem ver credenciais judit"
  ON public.credenciais_judit FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'controller'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'financeiro'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'comercial'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'agenda'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'advogado'::app_role, tenant_id)
    OR has_role_in_tenant(auth.uid(), 'estagiario'::app_role, tenant_id)
  );