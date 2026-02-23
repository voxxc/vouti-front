
CREATE TABLE public.whatsapp_emoji_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, emoji)
);

ALTER TABLE public.whatsapp_emoji_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_emoji_history_select" ON public.whatsapp_emoji_history
  FOR SELECT USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_emoji_history_insert" ON public.whatsapp_emoji_history
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_emoji_history_update" ON public.whatsapp_emoji_history
  FOR UPDATE USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);
