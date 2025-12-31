-- Adicionar colunas project_id e task_title para auditoria permanente
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE task_history ADD COLUMN IF NOT EXISTS task_title TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_task_history_project_id ON task_history(project_id);

-- Preencher dados existentes com project_id e task_title
UPDATE task_history th
SET 
  project_id = t.project_id,
  task_title = t.title
FROM tasks t
WHERE th.task_id = t.id AND th.project_id IS NULL;

-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Users can view history on accessible tasks" ON task_history;

-- Nova política que funciona mesmo após deleção da task
CREATE POLICY "Users can view history on accessible projects"
ON task_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = task_history.project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_collaborators pc
        WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    )
  )
);

-- Habilitar realtime para task_history
ALTER TABLE task_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE task_history;