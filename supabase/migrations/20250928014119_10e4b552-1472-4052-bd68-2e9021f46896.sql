-- Add foreign key constraint between deadlines and projects
ALTER TABLE public.deadlines 
ADD CONSTRAINT deadlines_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;