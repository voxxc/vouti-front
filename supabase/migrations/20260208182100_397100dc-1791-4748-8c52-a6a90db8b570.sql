-- ============================================
-- ETAPA 1: Criar tabela de fila de mensagens
-- ============================================

CREATE TABLE whatsapp_pending_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  trigger_id UUID REFERENCES whatsapp_lead_triggers(id),
  lead_source TEXT NOT NULL, -- 'landing_leads' ou 'leads_captacao'
  lead_id UUID NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca eficiente de mensagens pendentes
CREATE INDEX idx_pending_status_scheduled 
  ON whatsapp_pending_messages(status, scheduled_at) 
  WHERE status = 'pending';

-- RLS - permitir service role para edge functions
ALTER TABLE whatsapp_pending_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON whatsapp_pending_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Policy para tenants verem suas mensagens
CREATE POLICY "tenant_select" ON whatsapp_pending_messages
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- ============================================
-- ETAPA 2: Criar trigger para landing_leads
-- ============================================

CREATE OR REPLACE FUNCTION notify_whatsapp_landing_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger RECORD;
  v_message TEXT;
BEGIN
  -- Buscar triggers ativos para landing_leads
  FOR v_trigger IN 
    SELECT * FROM whatsapp_lead_triggers 
    WHERE lead_source = 'landing_leads' 
      AND is_active = true
  LOOP
    -- Substituir variáveis na mensagem
    v_message := v_trigger.welcome_message;
    v_message := REPLACE(v_message, '{{nome}}', COALESCE(NEW.nome, ''));
    v_message := REPLACE(v_message, '{{email}}', COALESCE(NEW.email, ''));
    v_message := REPLACE(v_message, '{{telefone}}', COALESCE(NEW.telefone, ''));
    v_message := REPLACE(v_message, '{{tamanho_escritorio}}', COALESCE(NEW.tamanho_escritorio, ''));
    v_message := REPLACE(v_message, '{{origem}}', COALESCE(NEW.origem, ''));
    
    -- Inserir na fila SOMENTE se tiver telefone
    IF NEW.telefone IS NOT NULL AND NEW.telefone != '' THEN
      INSERT INTO whatsapp_pending_messages (
        tenant_id,
        trigger_id,
        lead_source,
        lead_id,
        phone,
        message,
        scheduled_at
      ) VALUES (
        v_trigger.tenant_id,
        v_trigger.id,
        'landing_leads',
        NEW.id,
        NEW.telefone,
        v_message,
        NOW() + (v_trigger.welcome_delay_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER tr_landing_leads_whatsapp
  AFTER INSERT ON landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_landing_lead();

-- ============================================
-- ETAPA 3: Inserir configuração para DEMORAIS
-- ============================================

INSERT INTO whatsapp_lead_triggers (
  tenant_id,
  lead_source,
  is_active,
  welcome_message,
  welcome_delay_minutes
) VALUES (
  'd395b3a1-1ea1-4710-bcc1-ff5f6a279750',
  'landing_leads',
  true,
  '👋 Olá, {{nome}}!

Vi que você se cadastrou na VOUTI. Sou da equipe de atendimento e gostaria de saber:

Como posso te ajudar hoje? 

- Quer conhecer nossos planos?
- Tem alguma dúvida específica?
- Deseja agendar uma demonstração?

É só responder! 😊',
  1
) ON CONFLICT DO NOTHING;