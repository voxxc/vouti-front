-- Backfill: protocolos órfãos -> workspace default do projeto
UPDATE public.project_protocolos pp
SET workspace_id = w.id
FROM public.project_workspaces w
WHERE pp.workspace_id IS NULL
  AND pp.project_id = w.project_id
  AND w.is_default = true;

-- Trigger genérica: se workspace_id vier NULL no insert, atribuir default
CREATE OR REPLACE FUNCTION public.assign_default_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_proj uuid;
  v_default uuid;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- project_processos usa "projeto_id"; project_protocolos usa "project_id"
  IF TG_TABLE_NAME = 'project_processos' THEN
    v_proj := NEW.projeto_id;
  ELSE
    v_proj := NEW.project_id;
  END IF;

  IF v_proj IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_default
  FROM public.project_workspaces
  WHERE project_id = v_proj AND is_default = true
  LIMIT 1;

  IF v_default IS NOT NULL THEN
    NEW.workspace_id := v_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_workspace_processos ON public.project_processos;
CREATE TRIGGER trg_default_workspace_processos
  BEFORE INSERT ON public.project_processos
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_workspace_id();

DROP TRIGGER IF EXISTS trg_default_workspace_protocolos ON public.project_protocolos;
CREATE TRIGGER trg_default_workspace_protocolos
  BEFORE INSERT ON public.project_protocolos
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_workspace_id();