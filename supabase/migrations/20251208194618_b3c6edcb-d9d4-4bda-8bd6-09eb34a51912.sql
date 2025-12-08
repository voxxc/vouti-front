-- Preencher tenant_id nas OABs existentes baseado no user_id
UPDATE oabs_cadastradas oc
SET tenant_id = p.tenant_id
FROM profiles p
WHERE oc.user_id = p.user_id
AND oc.tenant_id IS NULL;

-- Também atualizar processos_oab que podem estar sem tenant_id
UPDATE processos_oab po
SET tenant_id = oc.tenant_id
FROM oabs_cadastradas oc
WHERE po.oab_id = oc.id
AND po.tenant_id IS NULL
AND oc.tenant_id IS NOT NULL;