-- 1. Adicionar email à tabela whatsapp_agents
ALTER TABLE public.whatsapp_agents
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- 2. Criar enum para roles do Vouti.Bot
DO $$ BEGIN
  CREATE TYPE public.whatsapp_agent_role AS ENUM ('admin', 'atendente');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Criar tabela de roles (separada, conforme boas práticas de segurança)
CREATE TABLE IF NOT EXISTS public.whatsapp_agent_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
  role whatsapp_agent_role NOT NULL DEFAULT 'atendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, role)
);

-- 4. RLS para whatsapp_agent_roles
ALTER TABLE public.whatsapp_agent_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view agent roles"
ON public.whatsapp_agent_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_agents wa
    WHERE wa.id = agent_id
    AND wa.tenant_id = get_user_tenant_id()
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Admins can manage agent roles"
ON public.whatsapp_agent_roles FOR ALL
TO authenticated
USING (
  (is_admin_or_controller_in_tenant()
  AND EXISTS (
    SELECT 1 FROM whatsapp_agents wa
    WHERE wa.id = agent_id
    AND wa.tenant_id = get_user_tenant_id()
  ))
  OR is_super_admin(auth.uid())
);

-- 5. Função para verificar se usuário tem acesso ao Vouti.Bot
-- IMPORTANTE: Admin do tenant TEM ACESSO AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.has_whatsapp_bot_access(
  _user_email TEXT,
  _tenant_id UUID
)
RETURNS TABLE (
  has_access BOOLEAN,
  access_type TEXT,
  agent_id UUID,
  agent_name TEXT,
  agent_role whatsapp_agent_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Primeiro verifica se é admin/controller do tenant (acesso automático)
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE p.email = _user_email
      AND ur.tenant_id = _tenant_id
      AND ur.role IN ('admin', 'controller')
  ) THEN
    RETURN QUERY SELECT 
      TRUE as has_access,
      'admin'::TEXT as access_type,
      NULL::UUID as agent_id,
      'Administrador'::TEXT as agent_name,
      'admin'::whatsapp_agent_role as agent_role;
    RETURN;
  END IF;

  -- Se não é admin, verifica se é agente cadastrado
  RETURN QUERY
  SELECT 
    TRUE as has_access,
    'agent'::TEXT as access_type,
    wa.id as agent_id,
    wa.name as agent_name,
    COALESCE(war.role, 'atendente'::whatsapp_agent_role) as agent_role
  FROM whatsapp_agents wa
  LEFT JOIN whatsapp_agent_roles war ON war.agent_id = wa.id
  WHERE wa.email = _user_email
    AND wa.tenant_id = _tenant_id
    AND wa.is_active = TRUE
  LIMIT 1;
END;
$$;

-- 6. Índice para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_agents_email_tenant 
ON public.whatsapp_agents(email, tenant_id) 
WHERE email IS NOT NULL;