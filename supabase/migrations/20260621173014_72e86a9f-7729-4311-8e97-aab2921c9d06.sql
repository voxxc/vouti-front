ALTER TABLE public.processos DROP CONSTRAINT IF EXISTS processos_numero_processo_key;
CREATE UNIQUE INDEX IF NOT EXISTS processos_tenant_numero_uidx ON public.processos (tenant_id, numero_processo);