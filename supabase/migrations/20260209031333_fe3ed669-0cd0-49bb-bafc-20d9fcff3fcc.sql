-- Atualizar status de conexão do Daniel para 'connected'
UPDATE public.whatsapp_instances
SET connection_status = 'connected'
WHERE agent_id = '80a953f6-73e1-4985-9717-ec73e1c40c1b';