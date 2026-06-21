DROP POLICY IF EXISTS "tenant_read_andamentos_manuais_docs" ON storage.objects;
CREATE POLICY "tenant_read_andamentos_manuais_docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'andamentos-manuais-docs'
  AND (storage.foldername(name))[1] = get_user_tenant_id()::text
);

DROP POLICY IF EXISTS "super_admin_read_andamentos_manuais_docs" ON storage.objects;
CREATE POLICY "super_admin_read_andamentos_manuais_docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'andamentos-manuais-docs'
  AND EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid())
);