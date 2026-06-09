
CREATE TABLE public.clientes_ficha_cadastral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  cliente_id uuid NOT NULL UNIQUE REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_by uuid,
  dados_contrato jsonb NOT NULL DEFAULT '{}'::jsonb,
  outros_clientes jsonb NOT NULL DEFAULT '[]'::jsonb,
  contas jsonb NOT NULL DEFAULT '[]'::jsonb,
  dividas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ficha_cad_tenant ON public.clientes_ficha_cadastral(tenant_id);
CREATE INDEX idx_ficha_cad_cliente ON public.clientes_ficha_cadastral(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_ficha_cadastral TO authenticated;
GRANT ALL ON public.clientes_ficha_cadastral TO service_role;

ALTER TABLE public.clientes_ficha_cadastral ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ficha_cad_select" ON public.clientes_ficha_cadastral
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "ficha_cad_insert" ON public.clientes_ficha_cadastral
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "ficha_cad_update" ON public.clientes_ficha_cadastral
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "ficha_cad_delete" ON public.clientes_ficha_cadastral
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER trg_ficha_cad_updated_at
  BEFORE UPDATE ON public.clientes_ficha_cadastral
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
