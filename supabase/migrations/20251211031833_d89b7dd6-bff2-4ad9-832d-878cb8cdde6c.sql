-- Corrigir registros orfaos que nao tem tenant_id (herdar do processo pai)
UPDATE processos_oab_andamentos a
SET tenant_id = p.tenant_id
FROM processos_oab p
WHERE a.processo_oab_id = p.id
AND a.tenant_id IS NULL;

-- Adicionar constraint NOT NULL para impedir andamentos sem tenant_id no futuro
ALTER TABLE processos_oab_andamentos 
ALTER COLUMN tenant_id SET NOT NULL;