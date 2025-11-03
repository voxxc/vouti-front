-- ============================================
-- ADMINISTRADORES: ACESSO TOTAL AO SISTEMA
-- ============================================

-- 1. PROFILES - Admins podem gerenciar todos os perfis
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. CLIENT HISTORY - Admins podem ver todo histórico
CREATE POLICY "Admins can view all client history"
ON public.client_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. LEAD COMMENTS - Admins podem gerenciar todos comentários
CREATE POLICY "Admins can manage all lead comments"
ON public.lead_comments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. DEADLINE COMENTARIOS - Admins podem gerenciar todos comentários
CREATE POLICY "Admins can manage all deadline comentarios"
ON public.deadline_comentarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. DEADLINE TAGS - Admins podem gerenciar todas tags
CREATE POLICY "Admins can manage all deadline tags"
ON public.deadline_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. ETIQUETAS - Admins podem gerenciar todas etiquetas
CREATE POLICY "Admins can manage all etiquetas"
ON public.etiquetas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. MESSAGES - Admins podem ver todas mensagens
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. MESSAGE ATTACHMENTS - Admins podem ver todos anexos
CREATE POLICY "Admins can view all message attachments"
ON public.message_attachments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. NOTIFICATIONS - Admins podem gerenciar todas notificações
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. TASKS - Admins podem gerenciar todas tarefas
CREATE POLICY "Admins can manage all tasks"
ON public.tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. PROJECT COLLABORATORS - Admins podem gerenciar colaboradores
CREATE POLICY "Admins can manage all project collaborators"
ON public.project_collaborators FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. PROJECT COLUMNS - Admins podem gerenciar colunas
CREATE POLICY "Admins can manage all project columns"
ON public.project_columns FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. PROCESSO DOCUMENTOS - Admins podem gerenciar documentos
CREATE POLICY "Admins can manage all processo documentos"
ON public.processo_documentos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 14. CLIENTE PAGAMENTO COMENTARIOS - Admins podem gerenciar comentários
CREATE POLICY "Admins can manage all cliente pagamento comentarios"
ON public.cliente_pagamento_comentarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 15. CONTROLADORIA PROCESSOS - Admins podem gerenciar
CREATE POLICY "Admins can manage all controladoria processos"
ON public.controladoria_processos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 16. WHATSAPP INSTANCES - Admins podem gerenciar
CREATE POLICY "Admins can manage all whatsapp instances"
ON public.whatsapp_instances FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 17. WHATSAPP AUTOMATIONS - Admins podem gerenciar
CREATE POLICY "Admins can manage all whatsapp automations"
ON public.whatsapp_automations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 18. WHATSAPP MESSAGES - Admins podem ver mensagens
CREATE POLICY "Admins can view all whatsapp messages"
ON public.whatsapp_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 19. TRIBUNAL CREDENTIALS - Admins podem gerenciar
CREATE POLICY "Admins can manage all tribunal credentials"
ON public.tribunal_credentials FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 20. TRIBUNAL SYNC LOGS - Admins podem ver logs
CREATE POLICY "Admins can view all tribunal sync logs"
ON public.tribunal_sync_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 21. COMARCAS - Admins podem gerenciar
CREATE POLICY "Admins can manage all comarcas"
ON public.comarcas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 22. GRUPOS ACOES - Admins podem gerenciar
CREATE POLICY "Admins can manage all grupos acoes"
ON public.grupos_acoes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 23. TIPOS ACAO - Admins podem gerenciar
CREATE POLICY "Admins can manage all tipos acao"
ON public.tipos_acao FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 24. TRIBUNAIS - Admins podem gerenciar
CREATE POLICY "Admins can manage all tribunais"
ON public.tribunais FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Completar políticas existentes que estão incompletas

-- CLIENTES - Adicionar INSERT e DELETE para admins
CREATE POLICY "Admins can create clientes"
ON public.clientes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clientes"
ON public.clientes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- CLIENTE DIVIDAS - Admins podem criar e deletar
CREATE POLICY "Admins can create cliente dividas"
ON public.cliente_dividas FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cliente dividas"
ON public.cliente_dividas FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cliente dividas"
ON public.cliente_dividas FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- CLIENTE DOCUMENTOS - Admins podem criar, editar e deletar
CREATE POLICY "Admins can create cliente documentos"
ON public.cliente_documentos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cliente documentos"
ON public.cliente_documentos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cliente documentos"
ON public.cliente_documentos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- DEADLINES - Admins podem criar, editar e deletar
CREATE POLICY "Admins can create deadlines"
ON public.deadlines FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deadlines"
ON public.deadlines FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete deadlines"
ON public.deadlines FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- LEADS CAPTACAO - Admins podem criar, editar e deletar
CREATE POLICY "Admins can create leads"
ON public.leads_captacao FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update leads"
ON public.leads_captacao FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete leads"
ON public.leads_captacao FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- PROJECTS - Admins podem criar, editar e ver
CREATE POLICY "Admins can view all projects"
ON public.projects FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create projects"
ON public.projects FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update projects"
ON public.projects FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- PROJUDI CREDENTIALS - Admins podem criar, editar e deletar
CREATE POLICY "Admins can create projudi credentials"
ON public.projudi_credentials FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update projudi credentials"
ON public.projudi_credentials FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete projudi credentials"
ON public.projudi_credentials FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));