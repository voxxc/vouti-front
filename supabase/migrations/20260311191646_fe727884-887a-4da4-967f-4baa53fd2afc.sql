
DROP POLICY IF EXISTS "Users can view deadlines in tenant" ON public.deadlines;

CREATE POLICY "Users can view deadlines in tenant"
ON public.deadlines
FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
  AND (
    auth.uid() = user_id
    OR auth.uid() = advogado_responsavel_id
    OR auth.uid() = concluido_por
    OR is_tagged_in_deadline(id, auth.uid())
  )
);
