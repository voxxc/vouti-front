-- Migrate existing columns (workspace_id IS NULL) to their project's default workspace
-- This ensures all pre-existing columns appear in the main/default tab

UPDATE project_columns pc
SET workspace_id = (
  SELECT pw.id 
  FROM project_workspaces pw 
  WHERE pw.project_id = pc.project_id 
  AND pw.is_default = true
  LIMIT 1
)
WHERE pc.workspace_id IS NULL
AND pc.sector_id IS NULL
AND EXISTS (
  SELECT 1 FROM project_workspaces pw 
  WHERE pw.project_id = pc.project_id 
  AND pw.is_default = true
);