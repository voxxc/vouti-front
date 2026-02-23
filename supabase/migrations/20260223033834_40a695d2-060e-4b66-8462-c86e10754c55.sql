
-- Tabela de macros
CREATE TABLE public.whatsapp_macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shortcut TEXT,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de tickets (status das conversas)
CREATE TABLE public.whatsapp_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  agent_id UUID REFERENCES whatsapp_agents(id),
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  accepted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_macros" ON public.whatsapp_macros
  FOR ALL USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "tenant_tickets" ON public.whatsapp_tickets
  FOR ALL USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_macros_updated_at
  BEFORE UPDATE ON public.whatsapp_macros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_tickets_updated_at
  BEFORE UPDATE ON public.whatsapp_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
