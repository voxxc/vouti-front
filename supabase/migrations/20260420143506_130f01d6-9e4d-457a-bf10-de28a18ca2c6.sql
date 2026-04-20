-- Allow authors to delete their own chat messages within the same tenant
CREATE POLICY "Users can delete their own messages"
ON public.planejador_task_messages
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- Allow authors to edit their own chat messages within the same tenant
CREATE POLICY "Users can update their own messages"
ON public.planejador_task_messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id())
WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id());