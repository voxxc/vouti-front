-- Backfill tenant_id for existing judit_api_logs entries
-- Associate orphan logs to correct tenant based on oab_id
UPDATE judit_api_logs jal
SET tenant_id = oc.tenant_id
FROM oabs_cadastradas oc
WHERE jal.oab_id = oc.id
  AND jal.tenant_id IS NULL
  AND oc.tenant_id IS NOT NULL;