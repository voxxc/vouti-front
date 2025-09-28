-- Create client_history table to track deadline history
CREATE TABLE public.client_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'deadline_completed', 'deadline_created', etc.
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own client history" 
ON public.client_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client history" 
ON public.client_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add foreign key constraint to projects
ALTER TABLE public.client_history 
ADD CONSTRAINT client_history_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;