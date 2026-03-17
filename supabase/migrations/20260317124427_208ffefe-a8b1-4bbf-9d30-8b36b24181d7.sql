ALTER TABLE task_history 
  DROP CONSTRAINT task_history_project_id_fkey,
  ADD CONSTRAINT task_history_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;