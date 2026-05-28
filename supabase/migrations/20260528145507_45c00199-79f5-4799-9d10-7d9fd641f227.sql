
CREATE OR REPLACE FUNCTION public.is_mentioned_in_deadline(_deadline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.comment_mentions cm
    JOIN public.deadline_comentarios dc ON dc.id = cm.comment_id
    WHERE cm.comment_type = 'deadline'
      AND dc.deadline_id = _deadline_id
      AND cm.mentioned_user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Users can view deadlines in tenant" ON public.deadlines;

CREATE POLICY "Users can view deadlines in tenant"
ON public.deadlines
FOR SELECT
USING (
  (tenant_id IS NOT NULL)
  AND (tenant_id = get_user_tenant_id())
  AND (
    (auth.uid() = user_id)
    OR (auth.uid() = advogado_responsavel_id)
    OR (auth.uid() = concluido_por)
    OR is_tagged_in_deadline(id, auth.uid())
    OR public.is_mentioned_in_deadline(id, auth.uid())
  )
);
