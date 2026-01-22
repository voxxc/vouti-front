-- Inserir processos faltantes na aba Processos do workspace
-- Os processos 0002391 e 0000284 estão vinculados a protocolos mas não aparecem na aba Processos

INSERT INTO project_processos (projeto_id, processo_oab_id, workspace_id, tenant_id, ordem)
SELECT 
  pp.project_id,
  pp.processo_oab_id,
  pp.workspace_id,
  pp.tenant_id,
  COALESCE((
    SELECT MAX(ordem) + 1 
    FROM project_processos 
    WHERE workspace_id = pp.workspace_id
  ), 0)
FROM project_protocolos pp
WHERE pp.processo_oab_id IS NOT NULL
  AND pp.workspace_id = '51aa0706-cd91-4185-8e67-e9b74fa58715'
  AND NOT EXISTS (
    SELECT 1 FROM project_processos ppr 
    WHERE ppr.processo_oab_id = pp.processo_oab_id 
    AND ppr.workspace_id = pp.workspace_id
  );