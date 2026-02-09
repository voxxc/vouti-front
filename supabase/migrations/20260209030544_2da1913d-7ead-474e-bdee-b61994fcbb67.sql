-- Criar tabela de agentes WhatsApp
CREATE TABLE public.whatsapp_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'atendente',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar referencia de agente na tabela de instancias
ALTER TABLE public.whatsapp_instances 
ADD COLUMN agent_id UUID REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_whatsapp_agents_updated_at
BEFORE UPDATE ON public.whatsapp_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_whatsapp_agents_updated_at();

-- Habilitar RLS
ALTER TABLE public.whatsapp_agents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "tenant_select_agents" ON public.whatsapp_agents
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_agents" ON public.whatsapp_agents
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update_agents" ON public.whatsapp_agents
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete_agents" ON public.whatsapp_agents
  FOR DELETE USING (tenant_id = get_user_tenant_id());