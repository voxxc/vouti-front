
-- Add origem and links to publicacoes for monitoring-driven publications
ALTER TABLE public.publicacoes
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'diario',
  ADD COLUMN IF NOT EXISTS processo_oab_id uuid NULL,
  ADD COLUMN IF NOT EXISTS andamento_id uuid NULL,
  ADD COLUMN IF NOT EXISTS anexo_id uuid NULL,
  ADD COLUMN IF NOT EXISTS storage_path text NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

-- Allow monitoring-origin publications to have no monitoramento_id
ALTER TABLE public.publicacoes
  ALTER COLUMN monitoramento_id DROP NOT NULL;

-- Dedup index for monitoring-origin
CREATE UNIQUE INDEX IF NOT EXISTS publicacoes_monitoramento_processo_unique
  ON public.publicacoes (tenant_id, processo_oab_id, andamento_id, anexo_id)
  WHERE origem = 'monitoramento_processo';

CREATE INDEX IF NOT EXISTS publicacoes_processo_oab_idx
  ON public.publicacoes (processo_oab_id)
  WHERE processo_oab_id IS NOT NULL;
