
ALTER TABLE public.processos_oab
  ADD COLUMN IF NOT EXISTS importado_por uuid,
  ADD COLUMN IF NOT EXISTS importado_por_email text;

CREATE TABLE IF NOT EXISTS public.processo_monitoramento_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  processo_oab_id uuid,
  numero_cnj text,
  acao text NOT NULL CHECK (acao IN ('ativado','pausado')),
  tracking_id text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pma_tenant_created ON public.processo_monitoramento_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pma_processo ON public.processo_monitoramento_audit(processo_oab_id);

ALTER TABLE public.processo_monitoramento_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support sees all monitoramento audit" ON public.processo_monitoramento_audit;
CREATE POLICY "Support sees all monitoramento audit"
  ON public.processo_monitoramento_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND COALESCE(p.is_support, false) = true
    )
  );

DROP POLICY IF EXISTS "Tenant admins read own monitoramento audit" ON public.processo_monitoramento_audit;
CREATE POLICY "Tenant admins read own monitoramento audit"
  ON public.processo_monitoramento_audit
  FOR SELECT
  USING (
    public.has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id)
  );

CREATE OR REPLACE FUNCTION public.set_processo_oab_importado_por()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.importado_por IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.importado_por := auth.uid();
    SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
    IF v_email IS NULL THEN
      SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    END IF;
    NEW.importado_por_email := v_email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processos_oab_set_importador ON public.processos_oab;
CREATE TRIGGER trg_processos_oab_set_importador
  BEFORE INSERT ON public.processos_oab
  FOR EACH ROW
  EXECUTE FUNCTION public.set_processo_oab_importado_por();

CREATE OR REPLACE FUNCTION public.log_processo_monitoramento_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF OLD.monitoramento_ativo IS DISTINCT FROM NEW.monitoramento_ativo THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
      IF v_email IS NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
      END IF;
    END IF;

    INSERT INTO public.processo_monitoramento_audit
      (tenant_id, processo_oab_id, numero_cnj, acao, tracking_id, user_id, user_email)
    VALUES
      (NEW.tenant_id, NEW.id, NEW.numero_cnj,
       CASE WHEN NEW.monitoramento_ativo THEN 'ativado' ELSE 'pausado' END,
       NEW.tracking_id, auth.uid(), v_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_processos_oab_log_monitoramento ON public.processos_oab;
CREATE TRIGGER trg_processos_oab_log_monitoramento
  AFTER UPDATE OF monitoramento_ativo ON public.processos_oab
  FOR EACH ROW
  EXECUTE FUNCTION public.log_processo_monitoramento_toggle();
