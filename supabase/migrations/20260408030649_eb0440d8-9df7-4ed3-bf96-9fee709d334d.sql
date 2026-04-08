
-- Fix: Isolate processo-documentos bucket by tenant
-- Drop existing unscoped policies
DROP POLICY IF EXISTS "Users can view their processos documentos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documentos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documentos" ON storage.objects;

-- SELECT: tenant-scoped + super admin
CREATE POLICY "Users can view their processos documentos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'processo-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );

-- INSERT: tenant-scoped only
CREATE POLICY "Users can upload documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'processo-documentos'
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

-- DELETE: tenant-scoped + super admin
CREATE POLICY "Users can delete their documentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'processo-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );
