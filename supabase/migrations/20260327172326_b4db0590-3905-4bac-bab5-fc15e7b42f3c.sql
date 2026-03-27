
-- Workflows de bot do WhatsApp
CREATE TABLE public.whatsapp_bot_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_value TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Passos do workflow
CREATE TABLE public.whatsapp_bot_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.whatsapp_bot_workflows(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessões ativas de bot (rastreia em qual passo o contato está)
CREATE TABLE public.whatsapp_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.whatsapp_bot_workflows(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  current_step_order INTEGER DEFAULT 0,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de automação rápida
CREATE TABLE public.whatsapp_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_bot_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for bot workflows" ON public.whatsapp_bot_workflows
  FOR ALL USING (
    tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Tenant isolation for workflow steps" ON public.whatsapp_bot_workflow_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_bot_workflows w
      WHERE w.id = workflow_id AND w.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "Tenant isolation for bot sessions" ON public.whatsapp_bot_sessions
  FOR ALL USING (
    tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Tenant isolation for automation rules" ON public.whatsapp_automation_rules
  FOR ALL USING (
    tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id()
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_bot_workflows_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_whatsapp_bot_workflows_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_workflows
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_bot_workflows_updated_at();

CREATE TRIGGER update_whatsapp_bot_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_bot_workflows_updated_at();

CREATE TRIGGER update_whatsapp_automation_rules_updated_at
  BEFORE UPDATE ON public.whatsapp_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_bot_workflows_updated_at();
