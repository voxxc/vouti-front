CREATE TABLE public.processo_oab_monitoramento_escavador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id uuid NOT NULL REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  numero_cnj text NOT NULL,
  escavador_id text,
  monitoramento_id text,
  frequencia text NOT NULL DEFAULT 'semanal',
  monitoramento_ativo boolean NOT NULL DEFAULT true,
  escavador_data jsonb,
  ultima_consulta timestamptz,
  ultima_atualizacao timestamptz,
  total_atualizacoes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (processo_oab_id)
);

CREATE INDEX idx_pomes_tenant ON public.processo_oab_monitoramento_escavador(tenant_id);
CREATE INDEX idx_pomes_escavador_id ON public.processo_oab_monitoramento_escavador(escavador_id);
CREATE INDEX idx_pomes_ativo ON public.processo_oab_monitoramento_escavador(monitoramento_ativo) WHERE monitoramento_ativo;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_oab_monitoramento_escavador TO authenticated;
GRANT ALL ON public.processo_oab_monitoramento_escavador TO service_role;

ALTER TABLE public.processo_oab_monitoramento_escavador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view escavador OAB monitoring"
  ON public.processo_oab_monitoramento_escavador FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant members can manage escavador OAB monitoring"
  ON public.processo_oab_monitoramento_escavador FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_pomes_updated_at
  BEFORE UPDATE ON public.processo_oab_monitoramento_escavador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();