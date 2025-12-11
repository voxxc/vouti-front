-- ============================================
-- CORREÇÃO: Andamentos órfãos sem tenant_id
-- ============================================

-- Atualizar processos_oab_andamentos que estão sem tenant_id
-- Copiando o tenant_id do processo_oab associado
UPDATE processos_oab_andamentos a
SET tenant_id = p.tenant_id
FROM processos_oab p
WHERE a.processo_oab_id = p.id
  AND a.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;