-- Tabela para configurações de IA por tenant
CREATE TABLE public.tenant_ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Tabela para histórico de mensagens do chat IA
CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  processo_oab_id UUID REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_tenant_ai_settings_updated_at
  BEFORE UPDATE ON public.tenant_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para tenant_ai_settings (4 políticas padrão)
CREATE POLICY "tenant_ai_settings_select" ON public.tenant_ai_settings
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_ai_settings_insert" ON public.tenant_ai_settings
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_ai_settings_update" ON public.tenant_ai_settings
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_ai_settings_delete" ON public.tenant_ai_settings
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- RLS Policies para ai_chat_messages (4 políticas padrão)
CREATE POLICY "ai_chat_messages_select" ON public.ai_chat_messages
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "ai_chat_messages_insert" ON public.ai_chat_messages
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "ai_chat_messages_update" ON public.ai_chat_messages
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "ai_chat_messages_delete" ON public.ai_chat_messages
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Índices para performance
CREATE INDEX idx_ai_chat_messages_processo ON public.ai_chat_messages(processo_oab_id);
CREATE INDEX idx_ai_chat_messages_tenant_user ON public.ai_chat_messages(tenant_id, user_id);
CREATE INDEX idx_ai_chat_messages_created ON public.ai_chat_messages(created_at DESC);