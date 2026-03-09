
-- Backfill: prazos com project_id mas sem workspace_id → usar workspace default do projeto
UPDATE deadlines d
SET workspace_id = pw.id
FROM project_workspaces pw
WHERE d.project_id = pw.project_id
  AND pw.is_default = TRUE
  AND d.workspace_id IS NULL;

-- Backfill: prazos sem project_id mas com processo_oab_id → resolver via project_processos
UPDATE deadlines d
SET workspace_id = pp.workspace_id
FROM project_processos pp
WHERE d.processo_oab_id = pp.processo_oab_id
  AND d.workspace_id IS NULL
  AND pp.workspace_id IS NOT NULL;
