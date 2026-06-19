
-- reuniao_arquivos: super admin SELECT/DELETE
CREATE POLICY "super_admin_select_reuniao_arquivos"
  ON public.reuniao_arquivos FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_reuniao_arquivos"
  ON public.reuniao_arquivos FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- reuniao_cliente_arquivos: super admin SELECT/DELETE
CREATE POLICY "super_admin_select_reuniao_cliente_arquivos"
  ON public.reuniao_cliente_arquivos FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_reuniao_cliente_arquivos"
  ON public.reuniao_cliente_arquivos FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- storage.objects: bucket reuniao-attachments
CREATE POLICY "super_admin_select_reuniao_attachments_storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reuniao-attachments' AND public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_reuniao_attachments_storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reuniao-attachments' AND public.is_super_admin(auth.uid()));

-- storage.objects: bucket reuniao-cliente-attachments
CREATE POLICY "super_admin_select_reuniao_cliente_attachments_storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reuniao-cliente-attachments' AND public.is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_reuniao_cliente_attachments_storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reuniao-cliente-attachments' AND public.is_super_admin(auth.uid()));
