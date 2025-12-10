-- Preencher tenant_id em processos_oab onde está NULL
-- Herdar do oabs_cadastradas (tabela pai)
UPDATE processos_oab p
SET tenant_id = o.tenant_id
FROM oabs_cadastradas o
WHERE p.oab_id = o.id
  AND p.tenant_id IS NULL
  AND o.tenant_id IS NOT NULL;

-- Atualizar total_processos para refletir contagem real
UPDATE oabs_cadastradas
SET total_processos = (
  SELECT COUNT(*) FROM processos_oab WHERE oab_id = oabs_cadastradas.id
)
WHERE total_processos IS DISTINCT FROM (
  SELECT COUNT(*) FROM processos_oab WHERE oab_id = oabs_cadastradas.id
);