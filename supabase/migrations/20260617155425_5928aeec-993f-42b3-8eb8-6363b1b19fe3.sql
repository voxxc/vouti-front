
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS arquivamento_status TEXT NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS arquivamento_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arquivamento_por UUID;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_arquivamento_status_check') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_arquivamento_status_check
      CHECK (arquivamento_status IN ('ativa','resolvida','deletada'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_acordo_arquivamento
  ON public.tasks (project_id, arquivamento_status)
  WHERE task_type = 'acordo';

CREATE TABLE IF NOT EXISTS public.planejador_task_acordos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  planejador_task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  acordo_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (planejador_task_id, acordo_task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejador_task_acordos TO authenticated;
GRANT ALL ON public.planejador_task_acordos TO service_role;
ALTER TABLE public.planejador_task_acordos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view planejador_task_acordos in their tenant"
  ON public.planejador_task_acordos FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users create planejador_task_acordos in their tenant"
  ON public.planejador_task_acordos FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Users delete planejador_task_acordos in their tenant"
  ON public.planejador_task_acordos FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX IF NOT EXISTS idx_pta_planejador ON public.planejador_task_acordos(planejador_task_id);
CREATE INDEX IF NOT EXISTS idx_pta_acordo ON public.planejador_task_acordos(acordo_task_id);
CREATE INDEX IF NOT EXISTS idx_pta_tenant ON public.planejador_task_acordos(tenant_id);

CREATE TABLE IF NOT EXISTS public.planejador_task_acordos_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  planejador_task_id UUID NOT NULL,
  acordo_task_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_reason TEXT NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejador_task_acordos_historico TO authenticated;
GRANT ALL ON public.planejador_task_acordos_historico TO service_role;
ALTER TABLE public.planejador_task_acordos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view pta_historico in their tenant"
  ON public.planejador_task_acordos_historico FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX IF NOT EXISTS idx_pta_hist_planejador ON public.planejador_task_acordos_historico(planejador_task_id);
CREATE INDEX IF NOT EXISTS idx_pta_hist_acordo ON public.planejador_task_acordos_historico(acordo_task_id);
CREATE INDEX IF NOT EXISTS idx_pta_hist_tenant ON public.planejador_task_acordos_historico(tenant_id);

ALTER TABLE public.planejador_task_messages
  ADD COLUMN IF NOT EXISTS acordo_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS acordo_titulo_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS acordo_valor_snapshot NUMERIC,
  ADD COLUMN IF NOT EXISTS acordo_credor_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_ptm_task_acordo_created
  ON public.planejador_task_messages(task_id, acordo_task_id, created_at);

CREATE OR REPLACE FUNCTION public.fill_acordo_snapshot_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
BEGIN
  IF NEW.acordo_task_id IS NOT NULL THEN
    SELECT title, acordo_details INTO v_task
    FROM public.tasks WHERE id = NEW.acordo_task_id;
    IF FOUND THEN
      NEW.acordo_titulo_snapshot := COALESCE(NEW.acordo_titulo_snapshot, v_task.title);
      NEW.acordo_credor_snapshot := COALESCE(NEW.acordo_credor_snapshot, v_task.acordo_details->>'banco');
      NEW.acordo_valor_snapshot := COALESCE(
        NEW.acordo_valor_snapshot,
        NULLIF(v_task.acordo_details->>'valorAtualizado','')::numeric,
        NULLIF(v_task.acordo_details->>'valorOriginal','')::numeric
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_acordo_snapshot ON public.planejador_task_messages;
CREATE TRIGGER trg_fill_acordo_snapshot
  BEFORE INSERT ON public.planejador_task_messages
  FOR EACH ROW EXECUTE FUNCTION public.fill_acordo_snapshot_on_message();

CREATE OR REPLACE FUNCTION public.handle_acordo_arquivamento_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.task_type IS DISTINCT FROM 'acordo' THEN
    RETURN NEW;
  END IF;
  IF NEW.arquivamento_status IS NOT DISTINCT FROM OLD.arquivamento_status THEN
    RETURN NEW;
  END IF;

  IF NEW.arquivamento_status = 'deletada' THEN
    INSERT INTO public.planejador_task_acordos_historico
      (tenant_id, planejador_task_id, acordo_task_id, created_by, created_at, removed_at, removed_reason)
    SELECT tenant_id, planejador_task_id, acordo_task_id, created_by, created_at, now(), 'acordo_deletada'
    FROM public.planejador_task_acordos
    WHERE acordo_task_id = NEW.id;

    DELETE FROM public.planejador_task_acordos WHERE acordo_task_id = NEW.id;
  END IF;

  IF OLD.arquivamento_status = 'deletada' AND NEW.arquivamento_status <> 'deletada' THEN
    INSERT INTO public.planejador_task_acordos
      (tenant_id, planejador_task_id, acordo_task_id, created_by, created_at)
    SELECT DISTINCT ON (planejador_task_id, acordo_task_id)
      tenant_id, planejador_task_id, acordo_task_id, created_by, created_at
    FROM public.planejador_task_acordos_historico
    WHERE acordo_task_id = NEW.id
      AND removed_reason = 'acordo_deletada'
    ORDER BY planejador_task_id, acordo_task_id, removed_at DESC
    ON CONFLICT (planejador_task_id, acordo_task_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_acordo_arquivamento ON public.tasks;
CREATE TRIGGER trg_handle_acordo_arquivamento
  AFTER UPDATE OF arquivamento_status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_acordo_arquivamento_change();

CREATE OR REPLACE FUNCTION public.archive_planejador_task_acordos_on_task_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.planejador_task_acordos_historico
    (tenant_id, planejador_task_id, acordo_task_id, created_by, created_at, removed_at, removed_reason)
  SELECT tenant_id, planejador_task_id, acordo_task_id, created_by, created_at, now(), 'task_deleted'
  FROM public.planejador_task_acordos
  WHERE planejador_task_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_pta_on_task_delete ON public.planejador_tasks;
CREATE TRIGGER trg_archive_pta_on_task_delete
  BEFORE DELETE ON public.planejador_tasks
  FOR EACH ROW EXECUTE FUNCTION public.archive_planejador_task_acordos_on_task_delete();
