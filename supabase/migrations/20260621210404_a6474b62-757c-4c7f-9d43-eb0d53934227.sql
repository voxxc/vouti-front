ALTER TABLE public.processos_oab
  ADD COLUMN IF NOT EXISTS super_admin_atualizado_em timestamptz NULL,
  ADD COLUMN IF NOT EXISTS super_admin_atualizado_por uuid NULL;

CREATE INDEX IF NOT EXISTS idx_processos_oab_super_admin_atualizado_em
  ON public.processos_oab (super_admin_atualizado_em)
  WHERE super_admin_atualizado_em IS NOT NULL;