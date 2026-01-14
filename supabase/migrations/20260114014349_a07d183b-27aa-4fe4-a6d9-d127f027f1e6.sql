-- Criar tabela project_workspaces
CREATE TABLE project_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nome VARCHAR(30) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX idx_project_workspaces_project ON project_workspaces(project_id);
CREATE INDEX idx_project_workspaces_tenant ON project_workspaces(tenant_id);

-- RLS
ALTER TABLE project_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspaces" ON project_workspaces FOR SELECT USING (true);
CREATE POLICY "Users can insert workspaces" ON project_workspaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update workspaces" ON project_workspaces FOR UPDATE USING (true);
CREATE POLICY "Users can delete workspaces" ON project_workspaces FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_project_workspaces_updated_at
  BEFORE UPDATE ON project_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar workspace_id nas tabelas existentes
ALTER TABLE project_columns 
ADD COLUMN workspace_id UUID REFERENCES project_workspaces(id) ON DELETE CASCADE;

ALTER TABLE project_protocolos 
ADD COLUMN workspace_id UUID REFERENCES project_workspaces(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD COLUMN workspace_id UUID REFERENCES project_workspaces(id) ON DELETE CASCADE;

-- Indices para as novas colunas
CREATE INDEX idx_project_columns_workspace ON project_columns(workspace_id);
CREATE INDEX idx_project_protocolos_workspace ON project_protocolos(workspace_id);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);