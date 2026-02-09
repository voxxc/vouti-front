-- Adicionar campo para tenants escolherem landing page
ALTER TABLE public.whatsapp_agents
ADD COLUMN landing_page_source TEXT DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.whatsapp_agents.landing_page_source IS 
'Fonte de leads que este agente atende (landing_page_1 ou landing_page_2). NULL = não atende nenhuma.';

-- Função trigger para automação de WhatsApp em leads_captacao
CREATE OR REPLACE FUNCTION public.notify_whatsapp_captacao_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_trigger RECORD;
  v_agent RECORD;
  v_message TEXT;
  v_phone TEXT;
BEGIN
  -- Só processa se tiver telefone
  IF NEW.telefone IS NULL OR NEW.telefone = '' THEN
    RETURN NEW;
  END IF;

  -- Normalizar telefone
  v_phone := REGEXP_REPLACE(NEW.telefone, '[^0-9]', '', 'g');
  IF LENGTH(v_phone) = 10 OR LENGTH(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- Buscar agente configurado para esta landing page no tenant
  SELECT wa.id, wa.is_active, wi.connection_status
  INTO v_agent
  FROM whatsapp_agents wa
  LEFT JOIN whatsapp_instances wi ON wi.agent_id = wa.id
  WHERE wa.tenant_id = NEW.tenant_id
    AND wa.landing_page_source = NEW.origem
    AND wa.is_active = TRUE
  LIMIT 1;

  -- Se não encontrou agente configurado ou não está conectado, retorna
  IF v_agent.id IS NULL OR v_agent.connection_status IS DISTINCT FROM 'connected' THEN
    RETURN NEW;
  END IF;

  -- Buscar configuração de trigger (mensagem de boas-vindas)
  FOR v_trigger IN 
    SELECT * FROM whatsapp_lead_triggers 
    WHERE tenant_id = NEW.tenant_id
      AND lead_source = 'leads_captacao'
      AND is_active = TRUE
  LOOP
    -- Preparar mensagem
    v_message := v_trigger.welcome_message;
    v_message := REPLACE(v_message, '{{nome}}', COALESCE(NEW.nome, ''));
    v_message := REPLACE(v_message, '{{telefone}}', COALESCE(NEW.telefone, ''));
    v_message := REPLACE(v_message, '{{email}}', COALESCE(NEW.email, ''));
    v_message := REPLACE(v_message, '{{mensagem}}', COALESCE(NEW.mensagem, ''));

    -- Inserir na fila
    INSERT INTO whatsapp_pending_messages (
      tenant_id,
      trigger_id,
      lead_source,
      lead_id,
      phone,
      message,
      scheduled_at
    ) VALUES (
      NEW.tenant_id,
      v_trigger.id,
      'leads_captacao',
      NEW.id,
      v_phone,
      v_message,
      NOW() + (v_trigger.welcome_delay_minutes || ' minutes')::INTERVAL
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Criar trigger na tabela leads_captacao
DROP TRIGGER IF EXISTS tr_leads_captacao_whatsapp ON leads_captacao;
CREATE TRIGGER tr_leads_captacao_whatsapp
  AFTER INSERT ON leads_captacao
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_captacao_lead();