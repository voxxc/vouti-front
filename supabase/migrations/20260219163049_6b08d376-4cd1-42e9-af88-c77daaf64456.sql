-- 1. Atualizar agente Daniel com landing_page_source
UPDATE public.whatsapp_agents 
SET landing_page_source = 'vouti_landing' 
WHERE id = 'd14ec6b2-e1e2-4685-bbb3-2e3b7f4a4f6e';

-- 2. Reprocessar mensagens falhadas do tenant demorais
UPDATE public.whatsapp_pending_messages 
SET status = 'pending', attempts = 0, error_message = NULL
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND status = 'failed';