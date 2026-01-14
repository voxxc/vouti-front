-- Criar função get_users_with_roles_by_tenant com parâmetro explícito
CREATE OR REPLACE FUNCTION public.get_users_with_roles_by_tenant(target_tenant_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  highest_role text,
  primary_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é super admin OU pertence ao tenant
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE super_admins.user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.tenant_id = target_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para acessar este tenant';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT ur.role::text
        FROM user_roles ur
        WHERE ur.user_id = p.user_id
          AND ur.tenant_id = target_tenant_id
        ORDER BY 
          CASE ur.role::text
            WHEN 'admin' THEN 6
            WHEN 'controller' THEN 5
            WHEN 'financeiro' THEN 4
            WHEN 'comercial' THEN 3
            WHEN 'agenda' THEN 2
            WHEN 'advogado' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      ),
      'advogado'
    ) as highest_role,
    COALESCE(
      (
        SELECT ur.role::text
        FROM user_roles ur
        WHERE ur.user_id = p.user_id
          AND ur.tenant_id = target_tenant_id
          AND ur.is_primary = true
        LIMIT 1
      ),
      (
        SELECT ur.role::text
        FROM user_roles ur
        WHERE ur.user_id = p.user_id
          AND ur.tenant_id = target_tenant_id
        ORDER BY 
          CASE ur.role::text
            WHEN 'admin' THEN 6
            WHEN 'controller' THEN 5
            WHEN 'financeiro' THEN 4
            WHEN 'comercial' THEN 3
            WHEN 'agenda' THEN 2
            WHEN 'advogado' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      ),
      'advogado'
    ) as primary_role
  FROM profiles p
  WHERE p.tenant_id = target_tenant_id
    AND p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@vouti.bio'
    AND p.email NOT LIKE '%@vlink.bio'
    -- Excluir super admins da listagem de usuários do tenant
    AND NOT EXISTS (
      SELECT 1 FROM super_admins sa WHERE sa.user_id = p.user_id
    )
  ORDER BY p.created_at DESC;
END;
$$;