-- ============================================
-- Importação em massa de processos
-- ============================================

-- Tabela: lotes de importação
CREATE TABLE public.processo_import_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  oab_id uuid NOT NULL REFERENCES public.oabs_cadastradas(id) ON DELETE CASCADE,
  criado_por uuid NOT NULL,
  nome_arquivo text,
  total_linhas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento','concluido','cancelado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_processo_import_lotes_tenant ON public.processo_import_lotes(tenant_id, created_at DESC);
CREATE INDEX idx_processo_import_lotes_oab ON public.processo_import_lotes(oab_id);

-- Tabela: jobs (1 por linha da planilha)
CREATE TABLE public.processo_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.processo_import_lotes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  oab_id uuid NOT NULL,
  linha_planilha integer NOT NULL,
  numero_cnj text NOT NULL,
  dados_planilha jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN (
      'pendente',
      'buscando_processo',
      'aguardando_andamentos',
      'buscando_andamentos',
      'concluido',
      'duplicado',
      'falha_processo',
      'falha_andamentos',
      'cancelado'
    )),
  tentativas_processo integer NOT NULL DEFAULT 0,
  tentativas_andamentos integer NOT NULL DEFAULT 0,
  processo_id uuid,
  andamentos_inseridos integer DEFAULT 0,
  erro_mensagem text,
  proximo_retry_em timestamptz NOT NULL DEFAULT now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_processo_import_jobs_lote ON public.processo_import_jobs(lote_id);
CREATE INDEX idx_processo_import_jobs_tenant ON public.processo_import_jobs(tenant_id);
CREATE INDEX idx_processo_import_jobs_pickup
  ON public.processo_import_jobs(status, proximo_retry_em)
  WHERE status IN ('pendente','aguardando_andamentos');
CREATE INDEX idx_processo_import_jobs_status ON public.processo_import_jobs(lote_id, status);

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.update_processo_import_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_processo_import_lotes_updated
BEFORE UPDATE ON public.processo_import_lotes
FOR EACH ROW EXECUTE FUNCTION public.update_processo_import_updated_at();

CREATE TRIGGER trg_processo_import_jobs_updated
BEFORE UPDATE ON public.processo_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_processo_import_updated_at();

-- Trigger: ao concluir/falhar TODOS os jobs, marcar lote como concluido
CREATE OR REPLACE FUNCTION public.check_lote_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendentes integer;
BEGIN
  IF NEW.status IN ('concluido','duplicado','falha_processo','falha_andamentos','cancelado') THEN
    SELECT COUNT(*) INTO v_pendentes
    FROM public.processo_import_jobs
    WHERE lote_id = NEW.lote_id
      AND status NOT IN ('concluido','duplicado','falha_processo','falha_andamentos','cancelado');

    IF v_pendentes = 0 THEN
      UPDATE public.processo_import_lotes
      SET status = 'concluido', updated_at = now()
      WHERE id = NEW.lote_id AND status = 'em_andamento';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_processo_import_jobs_lote_completion
AFTER UPDATE OF status ON public.processo_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.check_lote_completion();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.processo_import_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processo_import_jobs ENABLE ROW LEVEL SECURITY;

-- Lotes: leitura para qualquer membro do tenant
CREATE POLICY "Tenant members can view import lotes"
ON public.processo_import_lotes FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

-- Lotes: criação por admin/controller do tenant
CREATE POLICY "Admin/controller can create import lotes"
ON public.processo_import_lotes FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  AND public.is_admin_or_controller_in_tenant()
  AND criado_por = auth.uid()
);

-- Lotes: update (cancelar) por admin/controller
CREATE POLICY "Admin/controller can update import lotes"
ON public.processo_import_lotes FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id()
  AND public.is_admin_or_controller_in_tenant()
);

-- Jobs: leitura para qualquer membro do tenant
CREATE POLICY "Tenant members can view import jobs"
ON public.processo_import_jobs FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

-- Jobs: criação pelo dono do lote
CREATE POLICY "Admin/controller can create import jobs"
ON public.processo_import_jobs FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  AND public.is_admin_or_controller_in_tenant()
);

-- Jobs: update (reprocessar/cancelar) por admin/controller
CREATE POLICY "Admin/controller can update import jobs"
ON public.processo_import_jobs FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id()
  AND public.is_admin_or_controller_in_tenant()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.processo_import_lotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processo_import_jobs;
ALTER TABLE public.processo_import_lotes REPLICA IDENTITY FULL;
ALTER TABLE public.processo_import_jobs REPLICA IDENTITY FULL;