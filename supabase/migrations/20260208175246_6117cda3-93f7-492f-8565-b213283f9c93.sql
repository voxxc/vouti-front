-- Atualizar settings do tenant DEMORAIS para habilitar WhatsApp Bot
UPDATE tenants 
SET settings = jsonb_set(
  COALESCE(settings, '{}'), 
  '{whatsapp_enabled}', 
  'true'
)
WHERE slug = 'demorais';

-- Criar tabela para configuração de triggers de leads por WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_lead_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  lead_source TEXT NOT NULL CHECK (lead_source IN ('landing_leads', 'leads_captacao')),
  is_active BOOLEAN DEFAULT true,
  
  -- Configurações de mensagem de boas-vindas
  welcome_message TEXT NOT NULL,
  welcome_delay_minutes INTEGER DEFAULT 1,
  
  -- Follow-up automático (se não responder)
  followup_enabled BOOLEAN DEFAULT false,
  followup_message TEXT,
  followup_delay_hours INTEGER DEFAULT 24,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: apenas uma config ativa por fonte de leads por tenant
  UNIQUE(tenant_id, lead_source)
);

-- Enable RLS
ALTER TABLE public.whatsapp_lead_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_lead_triggers
CREATE POLICY "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers
  FOR SELECT USING (
    tenant_id IS NOT NULL AND (
      tenant_id = get_user_tenant_id() OR 
      is_super_admin(auth.uid())
    )
  );

CREATE POLICY "whatsapp_lead_triggers_insert" ON public.whatsapp_lead_triggers
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL AND (
      tenant_id = get_user_tenant_id() OR 
      is_super_admin(auth.uid())
    )
  );

CREATE POLICY "whatsapp_lead_triggers_update" ON public.whatsapp_lead_triggers
  FOR UPDATE USING (
    tenant_id IS NOT NULL AND (
      tenant_id = get_user_tenant_id() OR 
      is_super_admin(auth.uid())
    )
  );

CREATE POLICY "whatsapp_lead_triggers_delete" ON public.whatsapp_lead_triggers
  FOR DELETE USING (
    tenant_id IS NOT NULL AND (
      tenant_id = get_user_tenant_id() OR 
      is_super_admin(auth.uid())
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_lead_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_whatsapp_lead_triggers_updated_at
  BEFORE UPDATE ON public.whatsapp_lead_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_lead_triggers_updated_at();

-- Adicionar RLS policies nas tabelas whatsapp_instances, whatsapp_messages e whatsapp_automations
-- (caso ainda não existam com tenant_id)

-- Para whatsapp_instances (já tem tenant_id)
DROP POLICY IF EXISTS "whatsapp_instances_tenant_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_tenant_select" ON public.whatsapp_instances
  FOR SELECT USING (
    tenant_id = get_user_tenant_id() OR 
    user_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "whatsapp_instances_tenant_insert" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_tenant_insert" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id() OR 
    is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "whatsapp_instances_tenant_update" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_tenant_update" ON public.whatsapp_instances
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id() OR 
    user_id = auth.uid() OR
    is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "whatsapp_instances_tenant_delete" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_tenant_delete" ON public.whatsapp_instances
  FOR DELETE USING (
    tenant_id = get_user_tenant_id() OR 
    user_id = auth.uid() OR
    is_super_admin(auth.uid())
  );