-- Add workspace_id column to deadlines
ALTER TABLE deadlines ADD COLUMN workspace_id UUID REFERENCES project_workspaces(id);

-- Backfill: prazos com protocolo_etapa_id
UPDATE deadlines d
SET workspace_id = pp.workspace_id
FROM project_protocolo_etapas pe
JOIN project_protocolos pp ON pp.id = pe.protocolo_id
WHERE d.protocolo_etapa_id = pe.id
  AND d.workspace_id IS NULL
  AND pp.workspace_id IS NOT NULL;

-- Backfill: prazos com processo_oab_id (sem protocolo)
UPDATE deadlines d
SET workspace_id = ppr.workspace_id
FROM project_processos ppr
WHERE d.processo_oab_id = ppr.processo_oab_id
  AND d.protocolo_etapa_id IS NULL
  AND d.workspace_id IS NULL
  AND ppr.workspace_id IS NOT NULL;

-- Backfill: prazos restantes com project_id → workspace default
UPDATE deadlines d
SET workspace_id = pw.id
FROM project_workspaces pw
WHERE d.project_id = pw.project_id
  AND pw.is_default = TRUE
  AND d.workspace_id IS NULL;