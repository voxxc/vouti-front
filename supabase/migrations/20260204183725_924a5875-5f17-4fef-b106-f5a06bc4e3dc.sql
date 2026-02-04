-- Fix deadline_comentarios RLS policies
-- Problem: Comments disappear because SELECT policy is too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem ver comentários de prazos" ON deadline_comentarios;
DROP POLICY IF EXISTS "Admins can manage tenant deadline comentarios" ON deadline_comentarios;
DROP POLICY IF EXISTS "Users can view deadline comments" ON deadline_comentarios;
DROP POLICY IF EXISTS "Users can create deadline comments" ON deadline_comentarios;
DROP POLICY IF EXISTS "Users can delete own deadline comments" ON deadline_comentarios;

-- New SELECT policy: users can view comments if they have access to the deadline's project
CREATE POLICY "Users can view deadline comments" ON deadline_comentarios
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND (
      -- Author can always see their own comments
      user_id = auth.uid()
      OR
      -- Owner/responsible/tagged in deadline can see
      EXISTS (
        SELECT 1 FROM deadlines d
        WHERE d.id = deadline_id 
        AND (
          d.user_id = auth.uid() 
          OR d.advogado_responsavel_id = auth.uid()
          OR is_tagged_in_deadline(d.id, auth.uid())
        )
      )
      OR
      -- Project members can see comments on deadlines within their projects
      EXISTS (
        SELECT 1 FROM deadlines d
        JOIN projects p ON p.id = d.project_id
        WHERE d.id = deadline_id
        AND is_project_member(p.id, auth.uid())
      )
      OR
      -- Admins in same tenant can see all
      has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
    )
  );

-- INSERT policy: authenticated users in same tenant
CREATE POLICY "Users can create deadline comments" ON deadline_comentarios
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

-- DELETE policy: users can delete their own comments
CREATE POLICY "Users can delete own deadline comments" ON deadline_comentarios
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

-- Admin full access policy
CREATE POLICY "Admins can manage tenant deadline comentarios" ON deadline_comentarios
  FOR ALL USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  );