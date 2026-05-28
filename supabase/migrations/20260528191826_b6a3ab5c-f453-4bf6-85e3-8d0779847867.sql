DROP POLICY IF EXISTS "Users can view deadline comments" ON public.deadline_comentarios;

CREATE POLICY "Users can view deadline comments"
ON public.deadline_comentarios
FOR SELECT
USING (
  tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.deadlines d
      WHERE d.id = deadline_comentarios.deadline_id
        AND (d.user_id = auth.uid()
             OR d.advogado_responsavel_id = auth.uid()
             OR public.is_tagged_in_deadline(d.id, auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.deadlines d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deadline_comentarios.deadline_id
        AND public.is_project_member(p.id, auth.uid())
    )
    OR public.is_mentioned_in_deadline(deadline_comentarios.deadline_id, auth.uid())
    OR public.has_role_in_tenant(auth.uid(), 'admin'::app_role, get_user_tenant_id())
  )
);