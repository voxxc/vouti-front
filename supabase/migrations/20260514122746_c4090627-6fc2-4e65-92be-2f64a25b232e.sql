
-- 1. tenants: provider escolhido pelo super-admin
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS api_provider text NOT NULL DEFAULT 'judit'
  CHECK (api_provider IN ('judit','codilo'));

-- 2. processos_oab: rastreia provider por processo (coexistência durante migração)
ALTER TABLE public.processos_oab 
  ADD COLUMN IF NOT EXISTS api_provider text NOT NULL DEFAULT 'judit'
  CHECK (api_provider IN ('judit','codilo'));

-- 3. processo_monitoramento_judit: provider + push_id da Codilo
ALTER TABLE public.processo_monitoramento_judit
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'judit'
  CHECK (provider IN ('judit','codilo'));
ALTER TABLE public.processo_monitoramento_judit
  ADD COLUMN IF NOT EXISTS codilo_push_id text;

-- 4. Tabela de credenciais Codilo (espelho de credenciais_judit)
CREATE TABLE IF NOT EXISTS public.credenciais_codilo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  base_url text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','erro')),
  observacoes text,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE public.credenciais_codilo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin gerencia credenciais codilo"
  ON public.credenciais_codilo
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin do tenant le suas credenciais codilo"
  ON public.credenciais_codilo
  FOR SELECT
  USING (public.is_current_user_admin_in_tenant(tenant_id));

CREATE TRIGGER update_credenciais_codilo_updated_at
  BEFORE UPDATE ON public.credenciais_codilo
  FOR EACH ROW EXECUTE FUNCTION public.update_credenciais_judit_updated_at();

-- 5. RPC helper para Edge Functions
CREATE OR REPLACE FUNCTION public.get_provider_for_tenant(p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(api_provider, 'judit') FROM public.tenants WHERE id = p_tenant_id LIMIT 1;
$$;

CREATE INDEX IF NOT EXISTS idx_processos_oab_api_provider ON public.processos_oab(api_provider) WHERE api_provider <> 'judit';
CREATE INDEX IF NOT EXISTS idx_credenciais_codilo_tenant ON public.credenciais_codilo(tenant_id);
