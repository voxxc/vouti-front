-- Fase 1: blindar carteiras de processos contra sumiço silencioso

-- 1. Trocar CASCADE por RESTRICT na FK project_processo_id
ALTER TABLE public.project_carteira_processos
  DROP CONSTRAINT IF EXISTS project_carteira_processos_project_processo_id_fkey;

ALTER TABLE public.project_carteira_processos
  ADD CONSTRAINT project_carteira_processos_project_processo_id_fkey
  FOREIGN KEY (project_processo_id)
  REFERENCES public.project_processos(id)
  ON DELETE RESTRICT;

-- 2. Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.project_carteira_processos_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL CHECK (acao IN ('insert','delete','cascade_processo_deletado','cascade_carteira_deletada')),
  carteira_id uuid,
  project_processo_id uuid,
  projeto_id uuid,
  workspace_id uuid,
  tenant_id uuid,
  actor_user_id uuid,
  motivo text,
  snapshot jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcp_audit_tenant ON public.project_carteira_processos_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcp_audit_projeto ON public.project_carteira_processos_audit(projeto_id);
CREATE INDEX IF NOT EXISTS idx_pcp_audit_carteira ON public.project_carteira_processos_audit(carteira_id);

ALTER TABLE public.project_carteira_processos_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pcp_audit_select" ON public.project_carteira_processos_audit
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "service_role_pcp_audit_insert" ON public.project_carteira_processos_audit
  FOR INSERT WITH CHECK (true);

-- 3. Trigger: registrar antes de DELETE em project_carteira_processos
CREATE OR REPLACE FUNCTION public.audit_project_carteira_processos_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carteira RECORD;
BEGIN
  SELECT projeto_id, workspace_id, tenant_id INTO v_carteira
  FROM public.project_carteiras WHERE id = OLD.carteira_id;

  INSERT INTO public.project_carteira_processos_audit
    (acao, carteira_id, project_processo_id, projeto_id, workspace_id, tenant_id, actor_user_id, snapshot)
  VALUES
    ('delete', OLD.carteira_id, OLD.project_processo_id, v_carteira.projeto_id, v_carteira.workspace_id, v_carteira.tenant_id, auth.uid(), to_jsonb(OLD));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_pcp_delete ON public.project_carteira_processos;
CREATE TRIGGER trg_audit_pcp_delete
  BEFORE DELETE ON public.project_carteira_processos
  FOR EACH ROW EXECUTE FUNCTION public.audit_project_carteira_processos_delete();

-- 4. Trigger: registrar INSERT também
CREATE OR REPLACE FUNCTION public.audit_project_carteira_processos_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carteira RECORD;
BEGIN
  SELECT projeto_id, workspace_id, tenant_id INTO v_carteira
  FROM public.project_carteiras WHERE id = NEW.carteira_id;

  INSERT INTO public.project_carteira_processos_audit
    (acao, carteira_id, project_processo_id, projeto_id, workspace_id, tenant_id, actor_user_id, snapshot)
  VALUES
    ('insert', NEW.carteira_id, NEW.project_processo_id, v_carteira.projeto_id, v_carteira.workspace_id, v_carteira.tenant_id, auth.uid(), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_pcp_insert ON public.project_carteira_processos;
CREATE TRIGGER trg_audit_pcp_insert
  AFTER INSERT ON public.project_carteira_processos
  FOR EACH ROW EXECUTE FUNCTION public.audit_project_carteira_processos_insert();

-- 5. RPC para mover processo entre carteiras de forma atômica + validada
CREATE OR REPLACE FUNCTION public.mover_processo_para_carteira(
  p_project_processo_id uuid,
  p_carteira_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pp_workspace uuid;
  v_pp_tenant uuid;
  v_c_workspace uuid;
  v_c_tenant uuid;
BEGIN
  SELECT workspace_id, tenant_id INTO v_pp_workspace, v_pp_tenant
    FROM public.project_processos WHERE id = p_project_processo_id;
  SELECT workspace_id, tenant_id INTO v_c_workspace, v_c_tenant
    FROM public.project_carteiras WHERE id = p_carteira_id;

  IF v_pp_tenant IS NULL OR v_c_tenant IS NULL THEN
    RAISE EXCEPTION 'Processo ou carteira inexistente';
  END IF;
  IF v_pp_tenant <> v_c_tenant THEN
    RAISE EXCEPTION 'Tenant mismatch entre processo e carteira';
  END IF;
  IF v_pp_workspace IS DISTINCT FROM v_c_workspace THEN
    RAISE EXCEPTION 'Processo e carteira em workspaces diferentes';
  END IF;
  IF v_pp_tenant <> public.get_user_tenant_id() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Remover de outras carteiras do mesmo workspace
  DELETE FROM public.project_carteira_processos cp
  USING public.project_carteiras c
  WHERE cp.carteira_id = c.id
    AND cp.project_processo_id = p_project_processo_id
    AND c.workspace_id = v_c_workspace;

  -- Inserir no novo
  INSERT INTO public.project_carteira_processos (carteira_id, project_processo_id)
  VALUES (p_carteira_id, p_project_processo_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6. RPC para deletar processo SEM apagar a categorização (mantém auditoria)
CREATE OR REPLACE FUNCTION public.desvincular_processo_do_projeto(
  p_project_processo_id uuid,
  p_motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pp RECORD;
  v_count integer;
BEGIN
  SELECT * INTO v_pp FROM public.project_processos WHERE id = p_project_processo_id;
  IF v_pp.id IS NULL THEN RETURN; END IF;
  IF v_pp.tenant_id <> public.get_user_tenant_id() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Auditar e remover vínculos de carteira (motivo: cascade)
  INSERT INTO public.project_carteira_processos_audit
    (acao, carteira_id, project_processo_id, projeto_id, workspace_id, tenant_id, actor_user_id, motivo, snapshot)
  SELECT 'cascade_processo_deletado', cp.carteira_id, cp.project_processo_id,
         v_pp.projeto_id, v_pp.workspace_id, v_pp.tenant_id, auth.uid(),
         COALESCE(p_motivo, 'desvincular_processo_do_projeto'),
         to_jsonb(cp)
  FROM public.project_carteira_processos cp
  WHERE cp.project_processo_id = p_project_processo_id;

  DELETE FROM public.project_carteira_processos WHERE project_processo_id = p_project_processo_id;
  DELETE FROM public.project_processos WHERE id = p_project_processo_id;
END;
$$;