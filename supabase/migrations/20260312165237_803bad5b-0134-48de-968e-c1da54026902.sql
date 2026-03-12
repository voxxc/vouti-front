
-- RPC: get_agent_conversations — returns conversations grouped by phone for a specific agent
-- Bypasses the 1000-row Supabase limit by aggregating server-side
CREATE OR REPLACE FUNCTION public.get_agent_conversations(
  p_agent_id uuid, 
  p_tenant_id uuid
)
RETURNS TABLE(
  from_number text, 
  last_message text, 
  last_message_time timestamptz, 
  unread_count bigint,
  agent_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    sub.from_number,
    sub.message_text as last_message,
    sub.created_at as last_message_time,
    (SELECT count(*) FROM whatsapp_messages m2 
     WHERE m2.from_number = sub.from_number 
     AND m2.agent_id = p_agent_id
     AND m2.tenant_id = p_tenant_id
     AND m2.direction = 'received' 
     AND m2.is_read = false
    ) as unread_count,
    sub.agent_id
  FROM (
    SELECT DISTINCT ON (m.from_number)
      m.from_number,
      m.message_text,
      m.created_at,
      m.agent_id
    FROM whatsapp_messages m
    WHERE m.agent_id = p_agent_id 
      AND m.tenant_id = p_tenant_id
    ORDER BY m.from_number, m.created_at DESC
  ) sub
  ORDER BY sub.created_at DESC;
$$;

-- RPC: get_tenant_conversations — returns all conversations for a tenant (All Conversations view)
CREATE OR REPLACE FUNCTION public.get_tenant_conversations(
  p_tenant_id uuid
)
RETURNS TABLE(
  from_number text, 
  last_message text, 
  last_message_time timestamptz, 
  unread_count bigint,
  agent_id uuid,
  agent_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    sub.from_number,
    sub.message_text as last_message,
    sub.created_at as last_message_time,
    (SELECT count(*) FROM whatsapp_messages m2 
     WHERE m2.from_number = sub.from_number 
     AND m2.tenant_id = p_tenant_id
     AND m2.direction = 'received' 
     AND m2.is_read = false
    ) as unread_count,
    sub.agent_id,
    COALESCE(wa.name, 'Sem agente') as agent_name
  FROM (
    SELECT DISTINCT ON (m.from_number)
      m.from_number,
      m.message_text,
      m.created_at,
      m.agent_id
    FROM whatsapp_messages m
    WHERE m.tenant_id = p_tenant_id
    ORDER BY m.from_number, m.created_at DESC
  ) sub
  LEFT JOIN whatsapp_agents wa ON wa.id = sub.agent_id
  ORDER BY sub.created_at DESC;
$$;
