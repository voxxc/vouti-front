ALTER TABLE public.processos_oab
  ADD COLUMN IF NOT EXISTS judit_system_name text,
  ADD COLUMN IF NOT EXISTS judit_customer_key text;

CREATE INDEX IF NOT EXISTS idx_processos_oab_tenant_system
  ON public.processos_oab(tenant_id, judit_system_name)
  WHERE judit_system_name IS NOT NULL;