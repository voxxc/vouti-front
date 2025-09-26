-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create security definer functions to break RLS cycles
CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id AND p.created_by = uid
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators pc 
    WHERE pc.project_id = project_id AND pc.user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(project_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id AND p.created_by = uid
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view projects they collaborate on" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view tasks of their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON public.tasks;

DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators of their projects" ON public.project_collaborators;

-- Create new non-recursive policies using security definer functions

-- Projects policies
CREATE POLICY "Users can view their projects" 
ON public.projects 
FOR SELECT 
USING (public.is_project_member(id));

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project owners can update projects" 
ON public.projects 
FOR UPDATE 
USING (public.is_project_owner(id));

-- Tasks policies
CREATE POLICY "Users can view tasks of their projects" 
ON public.tasks 
FOR SELECT 
USING (public.is_project_member(project_id));

CREATE POLICY "Users can create tasks in their projects" 
ON public.tasks 
FOR INSERT 
WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Users can update tasks in their projects" 
ON public.tasks 
FOR UPDATE 
USING (public.is_project_member(project_id));

-- Project collaborators policies
CREATE POLICY "Users can view project collaborators" 
ON public.project_collaborators 
FOR SELECT 
USING (public.is_project_member(project_id));

CREATE POLICY "Project owners can manage collaborators" 
ON public.project_collaborators 
FOR ALL 
USING (public.is_project_owner(project_id));