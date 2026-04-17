-- 1. Adicionar coluna ordem
ALTER TABLE public.planejador_tasks 
ADD COLUMN IF NOT EXISTS ordem INTEGER;

-- 2. Backfill: numerar tasks existentes por tenant
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY tenant_id 
    ORDER BY prazo ASC NULLS LAST, created_at ASC
  ) - 1 AS rn
  FROM public.planejador_tasks
  WHERE ordem IS NULL
)
UPDATE public.planejador_tasks pt
SET ordem = ranked.rn
FROM ranked
WHERE pt.id = ranked.id;

-- 3. Index para performance de ordenação
CREATE INDEX IF NOT EXISTS idx_planejador_tasks_tenant_ordem 
ON public.planejador_tasks(tenant_id, ordem);

-- 4. RPC para reordenar tarefa
CREATE OR REPLACE FUNCTION public.reorder_planejador_task(
  p_task_id UUID,
  p_new_ordem INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_tenant_id UUID;
  v_old_ordem INTEGER;
BEGIN
  -- Buscar tenant e ordem atual da task
  SELECT tenant_id, ordem INTO v_tenant_id, v_old_ordem
  FROM planejador_tasks
  WHERE id = p_task_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tarefa não encontrada';
  END IF;

  -- Validar que o usuário pertence ao tenant
  v_user_tenant_id := get_user_tenant_id();
  IF v_user_tenant_id IS DISTINCT FROM v_tenant_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Se ordem não mudou, não fazer nada
  IF v_old_ordem = p_new_ordem THEN
    RETURN;
  END IF;

  -- Estratégia simples: deslocar outras tasks
  IF v_old_ordem IS NULL OR p_new_ordem < v_old_ordem THEN
    -- Movendo pra cima (ou primeira atribuição): deslocar tasks no range [p_new_ordem, v_old_ordem) pra baixo
    UPDATE planejador_tasks
    SET ordem = ordem + 1
    WHERE tenant_id = v_tenant_id
      AND id <> p_task_id
      AND ordem >= p_new_ordem
      AND (v_old_ordem IS NULL OR ordem < v_old_ordem);
  ELSE
    -- Movendo pra baixo: deslocar tasks no range (v_old_ordem, p_new_ordem] pra cima
    UPDATE planejador_tasks
    SET ordem = ordem - 1
    WHERE tenant_id = v_tenant_id
      AND id <> p_task_id
      AND ordem > v_old_ordem
      AND ordem <= p_new_ordem;
  END IF;

  -- Aplicar nova ordem na task alvo
  UPDATE planejador_tasks
  SET ordem = p_new_ordem,
      updated_at = NOW()
  WHERE id = p_task_id;
END;
$$;