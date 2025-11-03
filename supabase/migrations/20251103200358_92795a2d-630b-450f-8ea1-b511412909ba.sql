-- Step 2: Enable RLS on project_sectors and add policies (if not already exists)
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE project_sectors ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Admins can manage all project sectors" ON project_sectors;
DROP POLICY IF EXISTS "Members can view sectors for their projects" ON project_sectors;
DROP POLICY IF EXISTS "Members can insert sectors on their projects" ON project_sectors;
DROP POLICY IF EXISTS "Members can update sectors on their projects" ON project_sectors;
DROP POLICY IF EXISTS "Members can delete sectors on their projects" ON project_sectors;

-- Create policies
CREATE POLICY "Admins can manage all project sectors"
  ON project_sectors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view sectors for their projects"
  ON project_sectors FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "Members can insert sectors on their projects"
  ON project_sectors FOR INSERT
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update sectors on their projects"
  ON project_sectors FOR UPDATE
  USING (is_project_member(project_id));

CREATE POLICY "Members can delete sectors on their projects"
  ON project_sectors FOR DELETE
  USING (is_project_member(project_id));

-- Step 3: Add unique indexes to avoid duplications (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_template 
  ON project_sectors(project_id, template_id) 
  WHERE template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sector_template_user_name 
  ON sector_templates(created_by, lower(name));

-- Step 4: Create trigger to auto-populate sectors in new projects (if not exists)
DROP TRIGGER IF EXISTS trigger_create_sectors_for_new_project ON projects;

CREATE TRIGGER trigger_create_sectors_for_new_project
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_sectors_for_new_project();