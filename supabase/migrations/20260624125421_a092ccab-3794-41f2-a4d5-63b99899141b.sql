
CREATE TABLE public.super_admin_sistemas_processo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cor TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admin_sistemas_processo TO authenticated;
GRANT ALL ON public.super_admin_sistemas_processo TO service_role;

ALTER TABLE public.super_admin_sistemas_processo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_select_sistemas_processo"
  ON public.super_admin_sistemas_processo FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()));

ALTER TABLE public.processos_oab ADD COLUMN IF NOT EXISTS sistema_tag TEXT;
