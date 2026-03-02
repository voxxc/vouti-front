-- Add 'perito' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'perito';

-- Recreate get_users_with_roles with perito priority
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
 RETURNS TABLE(user_id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, highest_role text, primary_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            WHEN 'admin' THEN 7
            WHEN 'controller' THEN 6
            WHEN 'financeiro' THEN 5
            WHEN 'comercial' THEN 4
            WHEN 'agenda' THEN 3
            WHEN 'advogado' THEN 2
            WHEN 'estagiario' THEN 1
            WHEN 'perito' THEN 0
            ELSE -1
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
          AND ur.tenant_id = get_user_tenant_id()
          AND ur.is_primary = true
        LIMIT 1
      ),
      (
        SELECT ur.role::text
        FROM user_roles ur
        WHERE ur.user_id = p.user_id
          AND ur.tenant_id = get_user_tenant_id()
        ORDER BY 
          CASE ur.role::text
            WHEN 'admin' THEN 7
            WHEN 'controller' THEN 6
            WHEN 'financeiro' THEN 5
            WHEN 'comercial' THEN 4
            WHEN 'agenda' THEN 3
            WHEN 'advogado' THEN 2
            WHEN 'estagiario' THEN 1
            WHEN 'perito' THEN 0
            ELSE -1
          END DESC
        LIMIT 1
      ),
      'advogado'
    ) as primary_role
  FROM profiles p
  WHERE p.tenant_id = get_user_tenant_id()
    AND p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@vouti.bio'
    AND p.email NOT LIKE '%@vlink.bio'
    AND NOT EXISTS (
      SELECT 1 FROM super_admins sa WHERE sa.user_id = p.user_id
    )
  ORDER BY p.created_at DESC;
$function$;

-- Recreate get_users_with_roles_by_tenant with perito priority
CREATE OR REPLACE FUNCTION public.get_users_with_roles_by_tenant(target_tenant_id uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, highest_role text, primary_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
            WHEN 'admin' THEN 7
            WHEN 'controller' THEN 6
            WHEN 'financeiro' THEN 5
            WHEN 'comercial' THEN 4
            WHEN 'agenda' THEN 3
            WHEN 'advogado' THEN 2
            WHEN 'estagiario' THEN 1
            WHEN 'perito' THEN 0
            ELSE -1
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
            WHEN 'admin' THEN 7
            WHEN 'controller' THEN 6
            WHEN 'financeiro' THEN 5
            WHEN 'comercial' THEN 4
            WHEN 'agenda' THEN 3
            WHEN 'advogado' THEN 2
            WHEN 'estagiario' THEN 1
            WHEN 'perito' THEN 0
            ELSE -1
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
    AND NOT EXISTS (
      SELECT 1 FROM super_admins sa WHERE sa.user_id = p.user_id
    )
  ORDER BY p.created_at DESC;
END;
$function$;