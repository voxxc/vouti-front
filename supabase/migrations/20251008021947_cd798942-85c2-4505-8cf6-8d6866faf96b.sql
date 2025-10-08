-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Allow viewing profiles of users in the same projects (for collaboration)
CREATE POLICY "Project members can view collaborator profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc1
    JOIN public.project_collaborators pc2 ON pc1.project_id = pc2.project_id
    WHERE pc1.user_id = auth.uid()
    AND pc2.user_id = profiles.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = p.id
      AND pc.user_id = profiles.user_id
    )
  )
);