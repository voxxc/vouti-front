-- A. Expand UPDATE policy to allow advogado_responsavel and tagged users
DROP POLICY IF EXISTS "Users can update their deadlines in tenant" ON public.deadlines;

CREATE POLICY "Users can update their deadlines in tenant"
ON public.deadlines
FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
  AND (
    auth.uid() = user_id
    OR auth.uid() = advogado_responsavel_id
    OR is_tagged_in_deadline(id, auth.uid())
  )
);

-- B. Function to get project basic info bypassing projects RLS
CREATE OR REPLACE FUNCTION public.get_project_basic_info(project_ids uuid[])
RETURNS TABLE(id uuid, name text, client text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.client
  FROM projects p
  WHERE p.id = ANY(project_ids)
    AND p.tenant_id = get_user_tenant_id();
$$;