CREATE POLICY "Super-admins e suporte veem todas execucoes migracao"
  ON public.judit_migracao_attachments
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_support = true
    )
  );