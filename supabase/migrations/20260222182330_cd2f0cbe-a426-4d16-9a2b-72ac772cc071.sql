-- Create RPC function that returns only safe tenant fields (no auth required)
CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(p_slug text)
RETURNS TABLE(id uuid, slug text, is_active boolean, system_type_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.slug, t.is_active, t.system_type_id
  FROM tenants t
  WHERE LOWER(t.slug) = LOWER(p_slug)
    AND t.is_active = true
  LIMIT 1;
$$;

-- Remove the public policy
DROP POLICY IF EXISTS "Public can view active tenants by slug" ON tenants;