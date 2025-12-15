-- Drop the problematic policy that allows cross-tenant access
DROP POLICY IF EXISTS "Controllers can view all deadlines" ON public.deadlines;

-- Create new policy with proper tenant isolation
CREATE POLICY "Controllers can view tenant deadlines" ON public.deadlines
FOR SELECT USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND tenant_id IS NOT NULL 
  AND tenant_id = get_user_tenant_id()
);