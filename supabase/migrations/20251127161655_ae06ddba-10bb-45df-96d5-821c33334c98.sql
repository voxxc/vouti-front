-- Remover sistema Dental completamente

-- 1. Remover função has_dental_role
DROP FUNCTION IF EXISTS public.has_dental_role(uuid, dental_role);

-- 2. Remover função assign_dental_admin_role
DROP FUNCTION IF EXISTS public.assign_dental_admin_role();

-- 3. Atualizar função handle_new_user para remover bloco dental
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Metal users
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- Vouti.bio/Vlink users - TOTALMENTE ISOLADO (handled by handle_new_link_user trigger)
  IF NEW.email LIKE '%@vouti.bio' OR NEW.email LIKE '%@vlink.bio' THEN
    RETURN NEW;
  END IF;

  -- SOMENTE usuários do sistema jurídico chegam aqui
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 4. Atualizar função get_users_with_roles para remover filtro dental
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
 RETURNS TABLE(user_id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, updated_at timestamp with time zone, highest_role text)
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
        ORDER BY 
          CASE ur.role::text
            WHEN 'admin' THEN 5
            WHEN 'controller' THEN 4
            WHEN 'financeiro' THEN 3
            WHEN 'comercial' THEN 2
            WHEN 'advogado' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      ),
      'advogado'
    ) as highest_role
  FROM profiles p
  WHERE p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@vouti.bio'
    AND p.email NOT LIKE '%@vlink.bio'
  ORDER BY p.created_at DESC;
$function$;

-- 5. Remover o tipo/enum dental_role
DROP TYPE IF EXISTS public.dental_role CASCADE;