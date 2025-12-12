-- =============================================
-- PARTE 1: Tabela de Leads da Landing Page
-- =============================================

CREATE TABLE public.landing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  tamanho_escritorio TEXT,
  origem TEXT DEFAULT 'vouti_landing',
  status TEXT DEFAULT 'novo',
  atendido_por UUID,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- Policies: apenas super admins podem ver/gerenciar
CREATE POLICY "Super admins can view all landing leads"
ON public.landing_leads FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update landing leads"
ON public.landing_leads FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete landing leads"
ON public.landing_leads FOR DELETE
USING (is_super_admin(auth.uid()));

-- Permitir inserts públicos (da landing page)
CREATE POLICY "Anyone can insert landing leads"
ON public.landing_leads FOR INSERT
WITH CHECK (true);

-- =============================================
-- PARTE 2: Sistema de Suporte Multi-Tenant
-- =============================================

-- Tabela de tickets de suporte
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'aberto',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver seus proprios tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- Super admins podem ver todos os tickets
CREATE POLICY "Super admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all tickets"
ON public.support_tickets FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Tabela de mensagens de suporte
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver mensagens dos seus tickets
CREATE POLICY "Users can view messages of own tickets"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = support_messages.ticket_id
    AND st.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to own tickets"
ON public.support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = support_messages.ticket_id
    AND st.user_id = auth.uid()
  )
  AND sender_type = 'user'
);

-- Super admins podem ver e responder todas as mensagens
CREATE POLICY "Super admins can view all messages"
ON public.support_messages FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert messages"
ON public.support_messages FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) AND sender_type = 'admin');

CREATE POLICY "Super admins can update messages"
ON public.support_messages FOR UPDATE
USING (is_super_admin(auth.uid()));

-- =============================================
-- PARTE 3: Triggers para updated_at
-- =============================================

CREATE TRIGGER update_landing_leads_updated_at
BEFORE UPDATE ON public.landing_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar last_message_at no ticket
CREATE OR REPLACE FUNCTION public.update_ticket_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ticket_last_message_trigger
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_last_message();

-- =============================================
-- PARTE 4: Enable Realtime
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_leads;