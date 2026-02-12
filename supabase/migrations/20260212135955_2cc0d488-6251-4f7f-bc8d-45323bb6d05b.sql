
-- Add agent_id column to whatsapp_ai_config
ALTER TABLE public.whatsapp_ai_config 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE;

-- Unique index: one config per agent (when agent_id is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_config_agent_id 
ON public.whatsapp_ai_config (agent_id) WHERE agent_id IS NOT NULL;

-- Unique index: one fallback config per tenant (when agent_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_config_tenant_fallback 
ON public.whatsapp_ai_config (tenant_id) WHERE agent_id IS NULL AND tenant_id IS NOT NULL;

-- Unique index: one global fallback (super admin, both NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_ai_config_global_fallback 
ON public.whatsapp_ai_config (is_enabled) WHERE agent_id IS NULL AND tenant_id IS NULL;
