-- Storage policies para o bucket tenant-comprovantes-pagamento
-- Super Admin pode ver todos os comprovantes
CREATE POLICY "super_admin_select_comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-comprovantes-pagamento' 
  AND public.is_super_admin(auth.uid())
);

-- Tenants podem fazer upload de seus próprios comprovantes
CREATE POLICY "tenant_insert_comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-comprovantes-pagamento'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Tenants podem ver seus próprios comprovantes
CREATE POLICY "tenant_select_comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-comprovantes-pagamento'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);