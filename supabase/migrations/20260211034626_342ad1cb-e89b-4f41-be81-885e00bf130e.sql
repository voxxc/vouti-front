
-- 1. Atualizar a função create_default_kanban_columns para 10 colunas
CREATE OR REPLACE FUNCTION public.create_default_kanban_columns(p_agent_id uuid, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
  VALUES
    (p_tenant_id, p_agent_id, 'Topo de Funil', '#3b82f6', 0, true),
    (p_tenant_id, p_agent_id, '1° Contato', '#f59e0b', 1, true),
    (p_tenant_id, p_agent_id, '2° Contato', '#f97316', 2, true),
    (p_tenant_id, p_agent_id, '3° Contato', '#ef4444', 3, true),
    (p_tenant_id, p_agent_id, '4° Contato', '#ec4899', 4, true),
    (p_tenant_id, p_agent_id, 'Reunião Agendada', '#8b5cf6', 5, true),
    (p_tenant_id, p_agent_id, 'Proposta Enviada', '#6366f1', 6, true),
    (p_tenant_id, p_agent_id, 'Sem Retorno', '#6b7280', 7, true),
    (p_tenant_id, p_agent_id, 'Desqualificado', '#991b1b', 8, true),
    (p_tenant_id, p_agent_id, 'Fechado', '#22c55e', 9, true)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- 2. Recriar colunas default para agentes existentes que têm as 5 colunas antigas
-- Primeiro, deletar as colunas default antigas (que são as 5 originais)
DELETE FROM whatsapp_kanban_columns 
WHERE is_default = true 
  AND name IN ('Novo Lead', 'Em Contato', 'Negociando', 'Fechado', 'Perdido');

-- 3. Agora recriar com as 10 novas para todos os agentes que não têm colunas
INSERT INTO whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
SELECT 
  wa.tenant_id,
  wa.id,
  col.name,
  col.color,
  col.column_order,
  true
FROM whatsapp_agents wa
CROSS JOIN (
  VALUES 
    ('Topo de Funil', '#3b82f6', 0),
    ('1° Contato', '#f59e0b', 1),
    ('2° Contato', '#f97316', 2),
    ('3° Contato', '#ef4444', 3),
    ('4° Contato', '#ec4899', 4),
    ('Reunião Agendada', '#8b5cf6', 5),
    ('Proposta Enviada', '#6366f1', 6),
    ('Sem Retorno', '#6b7280', 7),
    ('Desqualificado', '#991b1b', 8),
    ('Fechado', '#22c55e', 9)
) AS col(name, color, column_order)
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_kanban_columns wkc 
  WHERE wkc.agent_id = wa.id AND wkc.name = col.name
);
