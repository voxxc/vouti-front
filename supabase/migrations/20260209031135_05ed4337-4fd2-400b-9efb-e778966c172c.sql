-- 1. Criar agente Daniel
INSERT INTO public.whatsapp_agents (tenant_id, name, role, is_active)
VALUES ('d395b3a1-1ea1-4710-bcc1-ff5f6a279750', 'Daniel', 'admin', true);

-- 2. Vincular instancia Z-API existente ao Daniel
UPDATE public.whatsapp_instances
SET agent_id = (
  SELECT id FROM public.whatsapp_agents 
  WHERE name = 'Daniel' AND tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  LIMIT 1
)
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'
  AND agent_id IS NULL;