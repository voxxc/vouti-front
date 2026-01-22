-- =====================================================
-- FASE 1: BACKFILL - Corrigir vínculos que já falharam
-- =====================================================

-- Inserir em project_processos todos os protocolos que têm processo_oab_id
-- e workspace_id definidos, mas que ainda não existem na aba Processos
INSERT INTO project_processos (projeto_id, processo_oab_id, workspace_id, tenant_id, ordem)
SELECT 
  pp.project_id,
  pp.processo_oab_id,
  pp.workspace_id,
  pp.tenant_id,
  COALESCE((
    SELECT MAX(ordem) + 1 
    FROM project_processos ppr
    WHERE ppr.projeto_id = pp.project_id 
      AND ppr.workspace_id = pp.workspace_id
  ), 0) AS ordem
FROM project_protocolos pp
WHERE pp.processo_oab_id IS NOT NULL
  AND pp.workspace_id IS NOT NULL
  AND pp.project_id IS NOT NULL
  AND pp.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_processos ppr 
    WHERE ppr.processo_oab_id = pp.processo_oab_id 
      AND ppr.workspace_id = pp.workspace_id
      AND ppr.projeto_id = pp.project_id
  );

-- =====================================================
-- FASE 2: UNIQUE INDEX - Prevenir duplicidades futuras
-- =====================================================

-- Criar índice único para garantir que não haja duplicatas
-- (projeto_id, workspace_id, processo_oab_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_processos_unique_vinculo 
ON project_processos (projeto_id, workspace_id, processo_oab_id);

-- =====================================================
-- FASE 3: TRIGGER - Garantir vínculo automático
-- =====================================================

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.ensure_project_processo_from_protocolo()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_ordem INTEGER;
BEGIN
  -- Só processa se tiver processo_oab_id e workspace_id definidos
  -- (workspace_id NULL = protocolo legado/default, não vincula automaticamente)
  IF NEW.processo_oab_id IS NOT NULL 
     AND NEW.workspace_id IS NOT NULL 
     AND NEW.project_id IS NOT NULL 
     AND NEW.tenant_id IS NOT NULL THEN
    
    -- Buscar próxima ordem
    SELECT COALESCE(MAX(ordem), -1) + 1 INTO v_max_ordem
    FROM project_processos
    WHERE projeto_id = NEW.project_id
      AND workspace_id = NEW.workspace_id;
    
    -- Inserir o vínculo (ON CONFLICT ignora se já existir)
    INSERT INTO project_processos (
      projeto_id, 
      processo_oab_id, 
      workspace_id, 
      tenant_id, 
      ordem
    ) VALUES (
      NEW.project_id,
      NEW.processo_oab_id,
      NEW.workspace_id,
      NEW.tenant_id,
      v_max_ordem
    )
    ON CONFLICT (projeto_id, workspace_id, processo_oab_id) DO NOTHING;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger em project_protocolos
DROP TRIGGER IF EXISTS trg_ensure_project_processo ON project_protocolos;

CREATE TRIGGER trg_ensure_project_processo
AFTER INSERT OR UPDATE OF processo_oab_id, workspace_id, project_id
ON project_protocolos
FOR EACH ROW
EXECUTE FUNCTION public.ensure_project_processo_from_protocolo();