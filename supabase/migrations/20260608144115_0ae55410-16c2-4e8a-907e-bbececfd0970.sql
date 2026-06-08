
-- ============================================================
-- 1) STORAGE: comprovantes-pagamento (path: {clienteId}/{filename})
-- ============================================================
DROP POLICY IF EXISTS "Users can view comprovantes of their clients" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete comprovantes of their clients" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload comprovantes for their clients" ON storage.objects;

CREATE POLICY "comprovantes_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes-pagamento'
    AND EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "comprovantes_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes-pagamento'
    AND EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "comprovantes_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes-pagamento'
    AND EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

-- ============================================================
-- 2) STORAGE: financial-documents (path: colaboradores/{colaboradorId}/...)
-- ============================================================
DROP POLICY IF EXISTS "financial_docs_tenant_select" ON storage.objects;
DROP POLICY IF EXISTS "financial_docs_tenant_insert" ON storage.objects;
DROP POLICY IF EXISTS "financial_docs_tenant_delete" ON storage.objects;

CREATE POLICY "financial_docs_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'financial-documents'
    AND (storage.foldername(name))[1] = 'colaboradores'
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "financial_docs_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financial-documents'
    AND (storage.foldername(name))[1] = 'colaboradores'
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "financial_docs_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'financial-documents'
    AND (storage.foldername(name))[1] = 'colaboradores'
    AND EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.tenant_id = public.get_user_tenant_id()
    )
  );

-- ============================================================
-- 3) STORAGE: message-attachments — drop overly broad SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read message attachments" ON storage.objects;
-- "Users can view their message attachments" (path-scoped) remains in place.

-- ============================================================
-- 4) STORAGE: reuniao-attachments — scope SELECT by uploader (path: {user.id}/...)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their reuniao files" ON storage.objects;

CREATE POLICY "Users can view their reuniao files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reuniao-attachments'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ============================================================
-- 5) notifications INSERT: require tenant match
-- ============================================================
DROP POLICY IF EXISTS "tenant_insert" ON public.notifications;

CREATE POLICY "tenant_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_user_tenant_id()
  );

-- ============================================================
-- 6) project_carteira_processos_audit INSERT: restrict to service_role
-- ============================================================
DROP POLICY IF EXISTS "service_role_pcp_audit_insert" ON public.project_carteira_processos_audit;

CREATE POLICY "service_role_pcp_audit_insert" ON public.project_carteira_processos_audit
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "tenant_pcp_audit_insert" ON public.project_carteira_processos_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_user_tenant_id()
  );

-- ============================================================
-- 7) tipos_acao: scope SELECT to user tenant
-- ============================================================
DROP POLICY IF EXISTS "Everyone can view tipos_acao" ON public.tipos_acao;

CREATE POLICY "Tenant can view tipos_acao" ON public.tipos_acao
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- ============================================================
-- 8) whatsapp_macros / whatsapp_tickets — remove null-tenant access
-- ============================================================
-- Reassign null-tenant rows to super_admin-only access by leaving them unowned;
-- since the OR (tenant_id IS NULL) clause is removed they will only be reachable
-- via service_role / super admin tooling.
DROP POLICY IF EXISTS "tenant_macros" ON public.whatsapp_macros;
CREATE POLICY "tenant_macros" ON public.whatsapp_macros
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "tenant_tickets" ON public.whatsapp_tickets;
CREATE POLICY "tenant_tickets" ON public.whatsapp_tickets
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());
