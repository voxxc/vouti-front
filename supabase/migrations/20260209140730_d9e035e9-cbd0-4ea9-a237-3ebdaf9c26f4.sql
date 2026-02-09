
-- Tabela para controlar timers de debounce
CREATE TABLE public.whatsapp_ai_pending_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  tenant_id UUID,
  instance_id TEXT NOT NULL,
  agent_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT unique_pending_phone_tenant UNIQUE (phone, tenant_id)
);

ALTER TABLE public.whatsapp_ai_pending_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.whatsapp_ai_pending_responses
  FOR ALL USING (true) WITH CHECK (true);

-- Coluna de delay na config
ALTER TABLE public.whatsapp_ai_config
  ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER NOT NULL DEFAULT 0;
