
CREATE TABLE IF NOT EXISTS public.super_admin_tribunais_andamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cor TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admin_tribunais_andamento TO authenticated;
GRANT ALL ON public.super_admin_tribunais_andamento TO service_role;

ALTER TABLE public.super_admin_tribunais_andamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tribunais_andamento_select_authenticated"
ON public.super_admin_tribunais_andamento
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "tribunais_andamento_super_admin_all"
ON public.super_admin_tribunais_andamento
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_super_admin_tribunais_andamento_updated_at
  ON public.super_admin_tribunais_andamento;
CREATE TRIGGER update_super_admin_tribunais_andamento_updated_at
BEFORE UPDATE ON public.super_admin_tribunais_andamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.super_admin_tribunais_andamento (slug, nome, cor) VALUES
  ('eproc',      'eproc',      '#2563eb'),
  ('projudi',    'Projudi',    '#7c3aed'),
  ('pje',        'PJe',        '#16a34a'),
  ('esaj',       'eSAJ',       '#ea580c'),
  ('tjgo-antigo','TJGO antigo','#64748b')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.processos_oab_andamentos
  ADD COLUMN IF NOT EXISTS super_admin_ordem INTEGER;

CREATE INDEX IF NOT EXISTS processos_oab_andamentos_super_admin_ordem_idx
  ON public.processos_oab_andamentos (processo_oab_id, super_admin_ordem DESC NULLS LAST, data_movimentacao DESC);
