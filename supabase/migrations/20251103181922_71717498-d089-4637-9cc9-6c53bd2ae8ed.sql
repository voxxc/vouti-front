-- Criar tabela de setores de projetos
CREATE TABLE project_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sector_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX idx_project_sectors_project_id ON project_sectors(project_id);

-- RLS Policies
ALTER TABLE project_sectors ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todos os setores
CREATE POLICY "Admins can manage all project sectors"
  ON project_sectors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Criadores de projetos podem gerenciar setores dos seus projetos
CREATE POLICY "Project creators can manage their project sectors"
  ON project_sectors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_sectors.project_id
      AND p.created_by = auth.uid()
    )
  );

-- Colaboradores podem visualizar setores dos projetos que participam
CREATE POLICY "Collaborators can view project sectors"
  ON project_sectors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = project_sectors.project_id
      AND pc.user_id = auth.uid()
    )
  );

-- Adicionar campo sector_id às colunas
ALTER TABLE project_columns
ADD COLUMN sector_id UUID REFERENCES project_sectors(id) ON DELETE CASCADE;

CREATE INDEX idx_project_columns_sector_id ON project_columns(sector_id);

-- Adicionar campo sector_id às tarefas
ALTER TABLE tasks
ADD COLUMN sector_id UUID REFERENCES project_sectors(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_sector_id ON tasks(sector_id);

-- Criar setor "Acordos" para todos os projetos existentes
INSERT INTO project_sectors (project_id, name, description, is_default, created_by, sector_order)
SELECT 
  id,
  'Acordos',
  'Setor de Acordos - Processos e Dívidas',
  true,
  created_by,
  0
FROM projects;

-- Criar 2 colunas padrão para cada setor "Acordos"
WITH acordos_sectors AS (
  SELECT id, project_id FROM project_sectors WHERE name = 'Acordos'
)
INSERT INTO project_columns (project_id, sector_id, name, column_order, color, is_default)
SELECT 
  as_table.project_id,
  as_table.id,
  col.name,
  col.col_order,
  col.color,
  true
FROM acordos_sectors as_table
CROSS JOIN (
  VALUES 
    ('Processos/Dívidas', 0, '#f59e0b'),
    ('Acordos Feitos', 1, '#10b981')
) AS col(name, col_order, color);

-- Atualizar tarefas do tipo 'acordo' para apontar para o setor
UPDATE tasks t
SET sector_id = (
  SELECT ps.id 
  FROM project_sectors ps 
  WHERE ps.project_id = t.project_id 
  AND ps.name = 'Acordos'
)
WHERE t.task_type = 'acordo';