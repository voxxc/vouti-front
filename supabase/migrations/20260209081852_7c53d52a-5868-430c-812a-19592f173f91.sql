-- Etapa 1.1: Permitir tenant_id NULL nas tabelas

-- whatsapp_lead_triggers: permitir Super Admin (tenant_id NULL)
ALTER TABLE whatsapp_lead_triggers 
  ALTER COLUMN tenant_id DROP NOT NULL;

-- whatsapp_pending_messages: permitir Super Admin (tenant_id NULL)
ALTER TABLE whatsapp_pending_messages 
  ALTER COLUMN tenant_id DROP NOT NULL;

-- Etapa 1.2: Atualizar função do trigger com normalização de telefone
CREATE OR REPLACE FUNCTION notify_whatsapp_landing_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger RECORD;
  v_message TEXT;
  v_phone TEXT;
BEGIN
  -- Normalizar telefone: remover caracteres não numéricos
  v_phone := REGEXP_REPLACE(NEW.telefone, '[^0-9]', '', 'g');
  
  -- Adicionar prefixo 55 se telefone tiver 10 ou 11 dígitos (sem código do país)
  IF LENGTH(v_phone) = 10 OR LENGTH(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- Buscar triggers ativos (incluindo Super Admin com tenant_id NULL)
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
        v_trigger.tenant_id,  -- NULL para Super Admin
        v_trigger.id,
        'landing_leads',
        NEW.id,
        v_phone,              -- Telefone normalizado com 55
        v_message,
        NOW() + (v_trigger.welcome_delay_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Etapa 1.3: Inserir trigger do Super Admin para landing_leads
INSERT INTO whatsapp_lead_triggers (
  tenant_id,
  lead_source,
  is_active,
  welcome_message,
  welcome_delay_minutes
) VALUES (
  NULL,
  'landing_leads',
  true,
  '👋 Olá, {{nome}}!

Sou o agente virtual da VOUTI. Vi que você acabou de conhecer nossa plataforma!

Como posso ajudar você hoje?',
  0
);