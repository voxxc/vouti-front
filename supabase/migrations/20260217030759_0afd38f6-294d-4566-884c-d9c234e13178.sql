
-- 1. Criar tabela de times
CREATE TABLE public.whatsapp_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view their teams"
  ON public.whatsapp_teams FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert teams"
  ON public.whatsapp_teams FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update teams"
  ON public.whatsapp_teams FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete teams"
  ON public.whatsapp_teams FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

-- 2. Adicionar team_id em whatsapp_agents
ALTER TABLE public.whatsapp_agents ADD COLUMN team_id uuid REFERENCES public.whatsapp_teams(id);

-- 3. Inserir coluna "Transferidos" para todos os agentes que ainda não têm
INSERT INTO public.whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
SELECT tenant_id, id, 'Transferidos', '#a855f7', -1, true
FROM public.whatsapp_agents
WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_kanban_columns wkc
  WHERE wkc.agent_id = whatsapp_agents.id AND wkc.name = 'Transferidos'
);

-- 4. Reordenar: shift all non-Transferidos up by 1, then set Transferidos to 0
UPDATE public.whatsapp_kanban_columns SET column_order = column_order + 1 WHERE name != 'Transferidos' AND column_order >= 0;
UPDATE public.whatsapp_kanban_columns SET column_order = 0 WHERE name = 'Transferidos';

-- 5. Atualizar função create_default_kanban_columns para incluir Transferidos
CREATE OR REPLACE FUNCTION public.create_default_kanban_columns(p_agent_id uuid, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
  VALUES
    (p_tenant_id, p_agent_id, 'Transferidos', '#a855f7', 0, true),
    (p_tenant_id, p_agent_id, 'Topo de Funil', '#3b82f6', 1, true),
    (p_tenant_id, p_agent_id, '1° Contato', '#f59e0b', 2, true),
    (p_tenant_id, p_agent_id, '2° Contato', '#f97316', 3, true),
    (p_tenant_id, p_agent_id, '3° Contato', '#ef4444', 4, true),
    (p_tenant_id, p_agent_id, '4° Contato', '#ec4899', 5, true),
    (p_tenant_id, p_agent_id, 'Reunião Agendada', '#8b5cf6', 6, true),
    (p_tenant_id, p_agent_id, 'Proposta Enviada', '#6366f1', 7, true),
    (p_tenant_id, p_agent_id, 'Sem Retorno', '#6b7280', 8, true),
    (p_tenant_id, p_agent_id, 'Desqualificado', '#991b1b', 9, true),
    (p_tenant_id, p_agent_id, 'Fechado', '#22c55e', 10, true)
  ON CONFLICT DO NOTHING;
END;
$function$;
