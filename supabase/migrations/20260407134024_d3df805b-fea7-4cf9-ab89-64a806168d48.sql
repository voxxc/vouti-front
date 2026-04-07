-- ============================================================
-- FIX: Scope all has_role() policies to tenant using has_role_in_tenant() + tenant_id filter
-- This prevents cross-tenant data access by admins/controllers
-- ============================================================

-- 1. cliente_pagamento_comentarios
DROP POLICY IF EXISTS "Admins can manage all cliente pagamento comentarios" ON public.cliente_pagamento_comentarios;
CREATE POLICY "Admins can manage all cliente pagamento comentarios"
  ON public.cliente_pagamento_comentarios FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 2. processo_andamentos_judit
DROP POLICY IF EXISTS "Controllers can view all andamentos judit" ON public.processo_andamentos_judit;
CREATE POLICY "Controllers can view all andamentos judit"
  ON public.processo_andamentos_judit FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 3. processo_atualizacoes_escavador
DROP POLICY IF EXISTS "Admins can manage all atualizacoes" ON public.processo_atualizacoes_escavador;
CREATE POLICY "Admins can manage all atualizacoes"
  ON public.processo_atualizacoes_escavador FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 4. processo_documentos (controller SELECT)
DROP POLICY IF EXISTS "Controllers can view all documentos" ON public.processo_documentos;
CREATE POLICY "Controllers can view all documentos"
  ON public.processo_documentos FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 5. processo_documentos (controller INSERT)
DROP POLICY IF EXISTS "Controllers can create documentos" ON public.processo_documentos;
CREATE POLICY "Controllers can create documentos"
  ON public.processo_documentos FOR INSERT TO public
  WITH CHECK (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 6. processo_etiquetas (controller ALL)
DROP POLICY IF EXISTS "Controllers can manage etiquetas" ON public.processo_etiquetas;
CREATE POLICY "Controllers can manage etiquetas"
  ON public.processo_etiquetas FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 7. processo_etiquetas (controller SELECT)
DROP POLICY IF EXISTS "Controllers can view all etiquetas" ON public.processo_etiquetas;
CREATE POLICY "Controllers can view all etiquetas"
  ON public.processo_etiquetas FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 8. processo_historico
DROP POLICY IF EXISTS "Controllers can view all historico" ON public.processo_historico;
CREATE POLICY "Controllers can view all historico"
  ON public.processo_historico FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 9. processo_monitoramento_escavador (admin ALL)
DROP POLICY IF EXISTS "Admins can manage all monitoramento" ON public.processo_monitoramento_escavador;
CREATE POLICY "Admins can manage all monitoramento"
  ON public.processo_monitoramento_escavador FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 10. processo_monitoramento_escavador (controller SELECT)
DROP POLICY IF EXISTS "Controllers can view all monitoramento" ON public.processo_monitoramento_escavador;
CREATE POLICY "Controllers can view all monitoramento"
  ON public.processo_monitoramento_escavador FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 11. processo_monitoramento_judit (controller SELECT)
DROP POLICY IF EXISTS "Controllers can view all monitoramento judit" ON public.processo_monitoramento_judit;
CREATE POLICY "Controllers can view all monitoramento judit"
  ON public.processo_monitoramento_judit FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 12. processo_movimentacao_conferencia (controller+admin ALL)
DROP POLICY IF EXISTS "Controllers can manage conferencias" ON public.processo_movimentacao_conferencia;
CREATE POLICY "Controllers can manage conferencias"
  ON public.processo_movimentacao_conferencia FOR ALL TO authenticated
  USING ((has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())) AND tenant_id = get_user_tenant_id())
  WITH CHECK ((has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())) AND tenant_id = get_user_tenant_id());

-- 13. processo_movimentacoes (controller+admin UPDATE)
DROP POLICY IF EXISTS "Controllers and admins can update all movimentacoes" ON public.processo_movimentacoes;
CREATE POLICY "Controllers and admins can update all movimentacoes"
  ON public.processo_movimentacoes FOR UPDATE TO authenticated
  USING ((has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())) AND tenant_id = get_user_tenant_id())
  WITH CHECK ((has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())) AND tenant_id = get_user_tenant_id());

-- 14. processo_movimentacoes (controller INSERT)
DROP POLICY IF EXISTS "Controllers can create movimentacoes" ON public.processo_movimentacoes;
CREATE POLICY "Controllers can create movimentacoes"
  ON public.processo_movimentacoes FOR INSERT TO public
  WITH CHECK (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 15. processo_movimentacoes (controller DELETE)
DROP POLICY IF EXISTS "Controllers can delete movimentacoes" ON public.processo_movimentacoes;
CREATE POLICY "Controllers can delete movimentacoes"
  ON public.processo_movimentacoes FOR DELETE TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 16. processo_movimentacoes (controller SELECT)
DROP POLICY IF EXISTS "Controllers can view all movimentacoes" ON public.processo_movimentacoes;
CREATE POLICY "Controllers can view all movimentacoes"
  ON public.processo_movimentacoes FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 17. processos (controller INSERT)
DROP POLICY IF EXISTS "Controllers can create processos" ON public.processos;
CREATE POLICY "Controllers can create processos"
  ON public.processos FOR INSERT TO public
  WITH CHECK (has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 18. projudi_credentials (admin INSERT)
DROP POLICY IF EXISTS "Admins can create projudi credentials" ON public.projudi_credentials;
CREATE POLICY "Admins can create projudi credentials"
  ON public.projudi_credentials FOR INSERT TO public
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 19. projudi_credentials (admin DELETE)
DROP POLICY IF EXISTS "Admins can delete projudi credentials" ON public.projudi_credentials;
CREATE POLICY "Admins can delete projudi credentials"
  ON public.projudi_credentials FOR DELETE TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 20. projudi_credentials (admin UPDATE)
DROP POLICY IF EXISTS "Admins can update projudi credentials" ON public.projudi_credentials;
CREATE POLICY "Admins can update projudi credentials"
  ON public.projudi_credentials FOR UPDATE TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 21. projudi_credentials (admin SELECT)
DROP POLICY IF EXISTS "Admins can view all projudi credentials" ON public.projudi_credentials;
CREATE POLICY "Admins can view all projudi credentials"
  ON public.projudi_credentials FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 22. reuniao_cliente_arquivos (admin ALL)
DROP POLICY IF EXISTS "Admins can manage all client files" ON public.reuniao_cliente_arquivos;
CREATE POLICY "Admins can manage all client files"
  ON public.reuniao_cliente_arquivos FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 23. reuniao_cliente_arquivos (users view - mixed policy)
DROP POLICY IF EXISTS "Users can view files of their clients" ON public.reuniao_cliente_arquivos;
CREATE POLICY "Users can view files of their clients"
  ON public.reuniao_cliente_arquivos FOR SELECT TO public
  USING (
    (EXISTS (SELECT 1 FROM reuniao_clientes rc WHERE rc.id = reuniao_cliente_arquivos.cliente_id AND rc.user_id = auth.uid()))
    OR (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  );

-- 24. reuniao_cliente_comentarios (admin ALL)
DROP POLICY IF EXISTS "Admins can manage all client comments" ON public.reuniao_cliente_comentarios;
CREATE POLICY "Admins can manage all client comments"
  ON public.reuniao_cliente_comentarios FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 25. reuniao_cliente_comentarios (users view - mixed policy)
DROP POLICY IF EXISTS "Users can view comments on their clients" ON public.reuniao_cliente_comentarios;
CREATE POLICY "Users can view comments on their clients"
  ON public.reuniao_cliente_comentarios FOR SELECT TO public
  USING (
    (EXISTS (SELECT 1 FROM reuniao_clientes rc WHERE rc.id = reuniao_cliente_comentarios.cliente_id AND rc.user_id = auth.uid()))
    OR (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  );

-- 26. reuniao_status (admin ALL with check)
DROP POLICY IF EXISTS "Admins podem gerenciar status" ON public.reuniao_status;
CREATE POLICY "Admins podem gerenciar status"
  ON public.reuniao_status FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 27. reuniao_status (agenda+admin ALL)
DROP POLICY IF EXISTS "Agenda users can manage status" ON public.reuniao_status;
CREATE POLICY "Agenda users can manage status"
  ON public.reuniao_status FOR ALL TO public
  USING ((has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'agenda', get_user_tenant_id())) AND tenant_id = get_user_tenant_id())
  WITH CHECK ((has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) OR has_role_in_tenant(auth.uid(), 'agenda', get_user_tenant_id())) AND tenant_id = get_user_tenant_id());

-- 28. sector_templates
DROP POLICY IF EXISTS "Admins can view all sector templates" ON public.sector_templates;
CREATE POLICY "Admins can view all sector templates"
  ON public.sector_templates FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 29. tipos_acao
DROP POLICY IF EXISTS "Admins can manage all tipos acao" ON public.tipos_acao;
CREATE POLICY "Admins can manage all tipos acao"
  ON public.tipos_acao FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 30. tribunal_credentials
DROP POLICY IF EXISTS "Admins can manage all tribunal credentials" ON public.tribunal_credentials;
CREATE POLICY "Admins can manage all tribunal credentials"
  ON public.tribunal_credentials FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 31. tribunal_sync_logs (no tenant_id column - check)
DROP POLICY IF EXISTS "Admins can view all tribunal sync logs" ON public.tribunal_sync_logs;
CREATE POLICY "Admins can view all tribunal sync logs"
  ON public.tribunal_sync_logs FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()));

-- 32. whatsapp_automations
DROP POLICY IF EXISTS "Admins can manage all whatsapp automations" ON public.whatsapp_automations;
CREATE POLICY "Admins can manage all whatsapp automations"
  ON public.whatsapp_automations FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 33. whatsapp_instances
DROP POLICY IF EXISTS "Admins can manage all whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Admins can manage all whatsapp instances"
  ON public.whatsapp_instances FOR ALL TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id())
  WITH CHECK (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 34. whatsapp_messages
DROP POLICY IF EXISTS "Admins can view all whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Admins can view all whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO public
  USING (has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) AND tenant_id = get_user_tenant_id());

-- 35. storage.objects - client documents
DROP POLICY IF EXISTS "Admins can manage all client documents" ON storage.objects;
CREATE POLICY "Admins can manage all client documents"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cliente-documentos' AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()))
  WITH CHECK (bucket_id = 'cliente-documentos' AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()));

-- 36. storage.objects - client attachments view
DROP POLICY IF EXISTS "Users can view client attachments" ON storage.objects;
CREATE POLICY "Users can view client attachments"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'reuniao-cliente-attachments' 
    AND (
      has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id()) 
      OR (auth.uid())::text = (storage.foldername(name))[1]
    )
  );