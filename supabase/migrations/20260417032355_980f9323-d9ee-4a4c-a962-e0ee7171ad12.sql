-- Tabela auxiliar para rate limiting de landing leads
CREATE TABLE IF NOT EXISTS public.landing_lead_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para queries rápidas de rate limit
CREATE INDEX IF NOT EXISTS idx_landing_lead_rate_limits_ip_created
  ON public.landing_lead_rate_limits (ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_landing_lead_rate_limits_phone_created
  ON public.landing_lead_rate_limits (phone, created_at DESC)
  WHERE phone IS NOT NULL;

-- RLS: bloquear acesso total via client (service role das edge functions ignora)
ALTER TABLE public.landing_lead_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_client_access_rate_limits" ON public.landing_lead_rate_limits;

CREATE POLICY "block_client_access_rate_limits"
ON public.landing_lead_rate_limits
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Função de limpeza periódica (mantém apenas últimas 48h)
CREATE OR REPLACE FUNCTION public.cleanup_landing_lead_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.landing_lead_rate_limits
  WHERE created_at < NOW() - INTERVAL '48 hours';
END;
$$;