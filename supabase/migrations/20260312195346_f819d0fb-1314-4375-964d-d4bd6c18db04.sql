CREATE POLICY "Project owners can delete their own projects"
  ON projects FOR DELETE
  USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());