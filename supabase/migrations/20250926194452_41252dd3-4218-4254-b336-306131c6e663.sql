-- Fix infinite recursion in project_collaborators policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators of their projects" ON public.project_collaborators;

-- Create corrected policies without recursion
CREATE POLICY "Project owners can manage collaborators" 
ON public.project_collaborators 
FOR ALL 
USING (
  -- Check if user is project owner directly from projects table
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can view collaborators of their projects" 
ON public.project_collaborators 
FOR SELECT 
USING (
  -- User is project owner OR user is a collaborator
  EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_collaborators.project_id 
    AND p.created_by = auth.uid()
  ) 
  OR 
  user_id = auth.uid()
);