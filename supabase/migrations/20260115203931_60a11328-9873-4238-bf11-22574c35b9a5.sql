-- 1) Adicionar coluna workspace_id na tabela project_processos
ALTER TABLE public.project_processos 
ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- 2) Adicionar FK para project_workspaces
ALTER TABLE public.project_processos 
ADD CONSTRAINT project_processos_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.project_workspaces(id) ON DELETE CASCADE;

-- 3) Backfill: atribuir workspace padrão para processos existentes
UPDATE public.project_processos pp
SET workspace_id = pw.id
FROM public.project_workspaces pw
WHERE pw.project_id = pp.projeto_id 
  AND pw.is_default = true 
  AND pp.workspace_id IS NULL;

-- 4) Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_project_processos_workspace 
ON public.project_processos(projeto_id, workspace_id);

-- 5) Criar índice único para evitar duplicidade do mesmo processo no mesmo workspace
CREATE UNIQUE INDEX IF NOT EXISTS project_processos_unique_per_ws 
ON public.project_processos(projeto_id, workspace_id, processo_oab_id);