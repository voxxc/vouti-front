
-- Remover politica permissiva
DROP POLICY IF EXISTS "Users can view workspaces" ON project_workspaces;

-- Criar politica com isolamento por tenant + membro do projeto
CREATE POLICY "Users can view workspaces"
  ON project_workspaces
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id()
    AND is_project_member(project_id)
  );
