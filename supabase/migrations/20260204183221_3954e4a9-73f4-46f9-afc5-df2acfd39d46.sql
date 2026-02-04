-- ===========================================
-- FIX: Project Tenant Isolation Leak
-- ===========================================

-- 1. Fix the orphan project with NULL tenant_id
UPDATE projects
SET tenant_id = (
  SELECT tenant_id FROM profiles WHERE user_id = projects.created_by LIMIT 1
)
WHERE id = 'd3749ef6-be1d-4848-8c25-324c7f899433' AND tenant_id IS NULL;

-- 2. Update is_project_member to include tenant check
CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid, uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id 
      AND p.created_by = uid
      AND p.tenant_id = get_user_tenant_id()
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators pc 
    JOIN projects p ON p.id = pc.project_id
    WHERE pc.project_id = project_id 
      AND pc.user_id = uid
      AND p.tenant_id = get_user_tenant_id()
  );
$$;

-- 3. Drop existing SELECT policies on projects
DROP POLICY IF EXISTS "Admins can view tenant projects" ON projects;
DROP POLICY IF EXISTS "Controller can view tenant projects" ON projects;
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Project members can view projects" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- 4. Create new SELECT policies with explicit tenant verification
CREATE POLICY "Admins can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  );

CREATE POLICY "Controllers can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())
  );

CREATE POLICY "Members can view their tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND is_project_member(id)
  );

-- 5. Allow super admins to view all projects (for admin panel)
CREATE POLICY "Super admins can view all projects" ON projects
  FOR SELECT USING (
    is_super_admin(auth.uid())
  );