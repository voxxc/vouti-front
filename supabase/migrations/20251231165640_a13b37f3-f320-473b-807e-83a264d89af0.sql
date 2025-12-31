-- 1. Add is_primary column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- 2. Create unique partial index: only one primary role per (user_id, tenant_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_one_primary_per_tenant 
ON public.user_roles (user_id, tenant_id) 
WHERE is_primary = true;

-- 3. Migrate existing data: for each (user_id, tenant_id), mark the first role as primary
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    tenant_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, tenant_id 
      ORDER BY 
        CASE role::text
          WHEN 'advogado' THEN 1
          WHEN 'comercial' THEN 2
          WHEN 'agenda' THEN 3
          WHEN 'reunioes' THEN 4
          WHEN 'financeiro' THEN 5
          WHEN 'controller' THEN 6
          WHEN 'admin' THEN 7
          ELSE 0
        END ASC
    ) as rn
  FROM public.user_roles
)
UPDATE public.user_roles ur
SET is_primary = true
FROM ranked_roles rr
WHERE ur.id = rr.id AND rr.rn = 1;

-- 4. DROP and recreate get_users_with_roles() with new return type
DROP FUNCTION IF EXISTS public.get_users_with_roles();

CREATE FUNCTION public.get_users_with_roles()
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
  WHERE p.tenant_id = get_user_tenant_id()
    AND p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@vouti.bio'
    AND p.email NOT LIKE '%@vlink.bio'
  ORDER BY p.created_at DESC;
$function$;

-- 5. RLS policies for financeiro role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clientes' AND policyname = 'Financeiro can view tenant clients'
  ) THEN
    CREATE POLICY "Financeiro can view tenant clients"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (
      has_role(auth.uid(), 'financeiro'::app_role) 
      AND tenant_id = get_user_tenant_id()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cliente_parcelas' AND policyname = 'Financeiro can view tenant parcelas'
  ) THEN
    CREATE POLICY "Financeiro can view tenant parcelas"
    ON public.cliente_parcelas FOR SELECT
    TO authenticated
    USING (
      has_role(auth.uid(), 'financeiro'::app_role) 
      AND tenant_id = get_user_tenant_id()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cliente_parcelas' AND policyname = 'Financeiro can update tenant parcelas'
  ) THEN
    CREATE POLICY "Financeiro can update tenant parcelas"
    ON public.cliente_parcelas FOR UPDATE
    TO authenticated
    USING (
      has_role(auth.uid(), 'financeiro'::app_role) 
      AND tenant_id = get_user_tenant_id()
    );
  END IF;
END $$;