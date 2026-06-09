-- reuniao-attachments: liberar SELECT para qualquer usuário do mesmo tenant do arquivo
DROP POLICY IF EXISTS "Users can view their reuniao files" ON storage.objects;

CREATE POLICY "Tenant users can view reuniao files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reuniao-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.reuniao_arquivos ra
      WHERE ra.file_path = storage.objects.name
        AND ra.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- reuniao-cliente-attachments: liberar SELECT para qualquer usuário do mesmo tenant do arquivo
DROP POLICY IF EXISTS "Users can view client attachments" ON storage.objects;

CREATE POLICY "Tenant users can view client attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reuniao-cliente-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role_in_tenant(auth.uid(), 'admin'::app_role, public.get_user_tenant_id())
    OR EXISTS (
      SELECT 1 FROM public.reuniao_cliente_arquivos rca
      WHERE rca.file_path = storage.objects.name
        AND rca.tenant_id = public.get_user_tenant_id()
    )
  )
);