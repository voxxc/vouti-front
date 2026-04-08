-- Fix: Restrict task-attachments SELECT to project-scoped access
DROP POLICY IF EXISTS "Users can view task attachments on accessible projects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task files" ON storage.objects;

-- SELECT: project-scoped access
CREATE POLICY "Users can view task attachments on accessible projects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND (
      is_super_admin(auth.uid())
      OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
      OR EXISTS (
        SELECT 1
        FROM task_files tf
        JOIN tasks t ON t.id = tf.task_id
        WHERE tf.file_path = name
          AND t.tenant_id = get_user_tenant_id()
          AND (
            t.project_id IN (SELECT p.id FROM projects p WHERE p.created_by = auth.uid())
            OR t.project_id IN (SELECT pc.project_id FROM project_collaborators pc WHERE pc.user_id = auth.uid())
          )
      )
    )
  );

-- INSERT: user-scoped path check
CREATE POLICY "Users can upload task attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );