-- Add step_id column to link attachments to movements
ALTER TABLE processos_oab_anexos 
ADD COLUMN IF NOT EXISTS step_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processos_oab_anexos_step_id ON processos_oab_anexos(step_id);

-- Sync existing attachments from capa_completa
INSERT INTO processos_oab_anexos (processo_oab_id, attachment_id, attachment_name, extension, status, step_id, tenant_id)
SELECT 
  p.id as processo_oab_id,
  att->>'attachment_id' as attachment_id,
  att->>'attachment_name' as attachment_name,
  att->>'extension' as extension,
  COALESCE(att->>'status', 'pending') as status,
  att->>'step_id' as step_id,
  p.tenant_id
FROM processos_oab p,
LATERAL jsonb_array_elements(p.capa_completa->'attachments') as att
WHERE p.capa_completa->'attachments' IS NOT NULL
  AND jsonb_array_length(p.capa_completa->'attachments') > 0
ON CONFLICT (processo_oab_id, attachment_id) 
DO UPDATE SET step_id = EXCLUDED.step_id;