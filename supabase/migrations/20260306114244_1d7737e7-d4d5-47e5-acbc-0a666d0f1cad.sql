
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view workspaces" ON public.project_workspaces;
DROP POLICY IF EXISTS "Users can insert workspaces" ON public.project_workspaces;
DROP POLICY IF EXISTS "Users can update workspaces" ON public.project_workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces" ON public.project_workspaces;

-- Recreate with admin/controller access
CREATE POLICY "Users can view workspaces" ON public.project_workspaces
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    is_project_member(project_id)
    OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
    OR has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  )
);

CREATE POLICY "Users can insert workspaces" ON public.project_workspaces
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND (
    is_project_member(project_id)
    OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
    OR has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  )
);

CREATE POLICY "Users can update workspaces" ON public.project_workspaces
FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    is_project_member(project_id)
    OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
    OR has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  )
);

CREATE POLICY "Users can delete workspaces" ON public.project_workspaces
FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    is_project_member(project_id)
    OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
    OR has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  )
);
