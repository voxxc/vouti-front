
-- Tabela de campanhas em massa
CREATE TABLE public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_column_id UUID REFERENCES public.whatsapp_kanban_columns(id),
  batch_size INTEGER DEFAULT 10,
  interval_minutes INTEGER DEFAULT 4,
  status TEXT DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mensagens individuais da campanha
CREATE TABLE public.whatsapp_campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_messages ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_campaigns
CREATE POLICY "Users can view campaigns in their tenant"
ON public.whatsapp_campaigns FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id()
  OR (tenant_id IS NULL AND public.is_super_admin(auth.uid()))
);

CREATE POLICY "Users can create campaigns in their tenant"
ON public.whatsapp_campaigns FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  OR (tenant_id IS NULL AND public.is_super_admin(auth.uid()))
);

CREATE POLICY "Users can update campaigns in their tenant"
ON public.whatsapp_campaigns FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id()
  OR (tenant_id IS NULL AND public.is_super_admin(auth.uid()))
);

CREATE POLICY "Users can delete campaigns in their tenant"
ON public.whatsapp_campaigns FOR DELETE
USING (
  tenant_id = public.get_user_tenant_id()
  OR (tenant_id IS NULL AND public.is_super_admin(auth.uid()))
);

-- Policies para whatsapp_campaign_messages
CREATE POLICY "Users can view campaign messages via campaign tenant"
ON public.whatsapp_campaign_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns wc
    WHERE wc.id = campaign_id
    AND (wc.tenant_id = public.get_user_tenant_id() OR (wc.tenant_id IS NULL AND public.is_super_admin(auth.uid())))
  )
);

CREATE POLICY "Users can insert campaign messages via campaign tenant"
ON public.whatsapp_campaign_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns wc
    WHERE wc.id = campaign_id
    AND (wc.tenant_id = public.get_user_tenant_id() OR (wc.tenant_id IS NULL AND public.is_super_admin(auth.uid())))
  )
);

CREATE POLICY "Users can update campaign messages via campaign tenant"
ON public.whatsapp_campaign_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns wc
    WHERE wc.id = campaign_id
    AND (wc.tenant_id = public.get_user_tenant_id() OR (wc.tenant_id IS NULL AND public.is_super_admin(auth.uid())))
  )
);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_campaigns_updated_at
BEFORE UPDATE ON public.whatsapp_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para performance
CREATE INDEX idx_campaign_messages_status ON public.whatsapp_campaign_messages(status, scheduled_at);
CREATE INDEX idx_campaigns_tenant ON public.whatsapp_campaigns(tenant_id, status);
