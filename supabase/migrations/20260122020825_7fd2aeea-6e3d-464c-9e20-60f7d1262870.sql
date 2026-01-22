
-- Corrigir protocolos órfãos do tenant Solvenza: associar ao workspace Principal do próprio projeto
UPDATE project_protocolos pp
SET workspace_id = (
  SELECT pw.id 
  FROM project_workspaces pw 
  WHERE pw.project_id = pp.project_id 
  ORDER BY pw.created_at 
  LIMIT 1
)
WHERE pp.id IN (
  SELECT pp2.id
  FROM project_protocolos pp2
  JOIN projects p ON p.id = pp2.project_id
  LEFT JOIN project_workspaces pw ON pw.id = pp2.workspace_id
  WHERE p.tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4'
    AND (pw.project_id IS NULL OR pw.project_id != pp2.project_id)
);

-- Deletar workspaces criados erroneamente (sem protocolos vinculados)
DELETE FROM project_workspaces 
WHERE id IN ('2b6ca434-af54-4aed-8749-c78708afcf03', 'efcf4cb6-2ff9-4546-94e7-5795b179b2d0')
  AND NOT EXISTS (
    SELECT 1 FROM project_protocolos WHERE workspace_id = project_workspaces.id
  );
