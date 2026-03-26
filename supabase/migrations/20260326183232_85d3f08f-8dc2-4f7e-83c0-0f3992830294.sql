CREATE POLICY "Peritos can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'perito'::app_role, get_user_tenant_id())
  );