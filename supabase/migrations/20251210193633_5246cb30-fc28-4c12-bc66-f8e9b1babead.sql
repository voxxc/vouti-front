-- ============================================
-- CORREÇÃO: Processos órfãos sem tenant_id
-- ============================================

-- Atualizar processos_oab que estão sem tenant_id
-- Copiando o tenant_id da oabs_cadastradas associada
UPDATE processos_oab p
SET tenant_id = o.tenant_id
FROM oabs_cadastradas o
WHERE p.oab_id = o.id
  AND p.tenant_id IS NULL
  AND o.tenant_id IS NOT NULL;