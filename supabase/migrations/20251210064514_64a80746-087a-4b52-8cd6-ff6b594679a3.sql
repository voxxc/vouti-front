-- Atualizar função get_users_with_roles para filtrar por tenant_id
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, highest_role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
          AND ur.tenant_id = get_user_tenant_id()
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
    ) as highest_role
  FROM profiles p
  WHERE p.tenant_id = get_user_tenant_id()
    AND p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@vouti.bio'
    AND p.email NOT LIKE '%@vlink.bio'
  ORDER BY p.created_at DESC;
$$;