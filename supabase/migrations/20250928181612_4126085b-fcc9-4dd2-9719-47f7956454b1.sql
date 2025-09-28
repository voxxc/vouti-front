-- Criar tabela para instâncias do WhatsApp
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL UNIQUE,
  connection_status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Criar tabela para mensagens do WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document'
  direction TEXT DEFAULT 'received', -- 'sent', 'received'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Criar tabela para automações do WhatsApp
CREATE TABLE public.whatsapp_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  trigger_keyword TEXT NOT NULL,
  response_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_instances
CREATE POLICY "Users can view their own WhatsApp instances"
ON public.whatsapp_instances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WhatsApp instances"
ON public.whatsapp_instances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp instances"
ON public.whatsapp_instances
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp instances"
ON public.whatsapp_instances
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para whatsapp_messages
CREATE POLICY "Users can view their own WhatsApp messages"
ON public.whatsapp_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WhatsApp messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Políticas para whatsapp_automations
CREATE POLICY "Users can view their own WhatsApp automations"
ON public.whatsapp_automations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WhatsApp automations"
ON public.whatsapp_automations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp automations"
ON public.whatsapp_automations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp automations"
ON public.whatsapp_automations
FOR DELETE
USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_name);
CREATE INDEX idx_whatsapp_automations_user_id ON public.whatsapp_automations(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_automations_updated_at
  BEFORE UPDATE ON public.whatsapp_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();