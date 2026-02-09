-- Adicionar coluna is_landing_agent na tabela whatsapp_agents
ALTER TABLE public.whatsapp_agents
ADD COLUMN is_landing_agent BOOLEAN DEFAULT FALSE;

-- Garantir que apenas UM agente do Super Admin pode ser o landing agent
CREATE UNIQUE INDEX unique_landing_agent_superadmin 
ON public.whatsapp_agents (is_landing_agent) 
WHERE tenant_id IS NULL AND is_landing_agent = TRUE;

-- Comentário explicativo
COMMENT ON COLUMN public.whatsapp_agents.is_landing_agent IS 
'Indica se este agente é responsável por atender leads da homepage (apenas para Super Admin)';