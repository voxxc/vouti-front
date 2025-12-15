-- Create tenant-aware role checking function
CREATE OR REPLACE FUNCTION public.has_role_in_tenant(_user_id uuid, _role app_role, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
      AND tenant_id = _tenant_id
  )
$$;