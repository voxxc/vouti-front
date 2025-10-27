-- Add DELETE policy for tasks table
CREATE POLICY "Users can delete tasks in their projects" 
ON public.tasks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = tasks.project_id AND (
      p.created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM public.project_collaborators pc 
        WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
      )
    )
  )
);