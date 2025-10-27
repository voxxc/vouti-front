-- Create project_columns table for custom kanban columns
CREATE TABLE IF NOT EXISTS public.project_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  column_order INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_columns
CREATE POLICY "Users can view columns of projects they own or collaborate on"
  ON public.project_columns FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Project owners can manage columns"
  ON public.project_columns FOR ALL
  USING (is_project_owner(project_id, auth.uid()))
  WITH CHECK (is_project_owner(project_id, auth.uid()));

-- Add column_id to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES public.project_columns(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_project_columns_project_id ON public.project_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON public.tasks(column_id);

-- Function to create default columns for new projects
CREATE OR REPLACE FUNCTION create_default_project_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_columns (project_id, name, column_order, color, is_default) VALUES
    (NEW.id, 'Em Espera', 0, '#eab308', true),
    (NEW.id, 'A Fazer', 1, '#3b82f6', true),
    (NEW.id, 'Andamento', 2, '#f97316', true),
    (NEW.id, 'Concluído', 3, '#22c55e', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default columns for new projects
DROP TRIGGER IF EXISTS trigger_create_default_columns ON public.projects;
CREATE TRIGGER trigger_create_default_columns
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_project_columns();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_columns_updated_at ON public.project_columns;
CREATE TRIGGER trigger_update_project_columns_updated_at
  BEFORE UPDATE ON public.project_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_project_columns_updated_at();