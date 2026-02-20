
ALTER TABLE project_protocolos ADD COLUMN ordem integer DEFAULT 0;

-- Inicializar ordem baseado na data de criação
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 AS new_ordem
  FROM project_protocolos
)
UPDATE project_protocolos SET ordem = ordered.new_ordem
FROM ordered WHERE project_protocolos.id = ordered.id;
