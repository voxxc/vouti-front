-- Drop existing INSERT policy that causes issues
DROP POLICY IF EXISTS "Admins can insert roles in tenant" ON public.user_roles;

-- Create a SECURITY DEFINER function to check if current user is admin in their own tenant
CREATE OR REPLACE FUNCTION public.is_current_user_admin_in_tenant(_target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND p.tenant_id = _target_tenant_id
  )
$$;

-- Create new INSERT policy that checks if admin is inserting into their own tenant
CREATE POLICY "Admins can insert roles in their tenant"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.is_current_user_admin_in_tenant(tenant_id)
);