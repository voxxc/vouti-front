-- ============================================
-- FASE 1: CORRIGIR RLS DAS TABELAS CRITICAS
-- ============================================

-- CLIENTES
DROP POLICY IF EXISTS "Admins can view all clients" ON clientes;
DROP POLICY IF EXISTS "Admins can create clientes" ON clientes;
DROP POLICY IF EXISTS "Admins can update all clients" ON clientes;
DROP POLICY IF EXISTS "Admins can delete clientes" ON clientes;

CREATE POLICY "Admins can view tenant clients" ON clientes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant clientes" ON clientes
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant clients" ON clientes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant clientes" ON clientes
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROJECTS
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;

CREATE POLICY "Admins can view tenant projects" ON projects
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant projects" ON projects
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant projects" ON projects
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant projects" ON projects
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- TASKS
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;

CREATE POLICY "Admins can view tenant tasks" ON tasks
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant tasks" ON tasks
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant tasks" ON tasks
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant tasks" ON tasks
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- DEADLINES
DROP POLICY IF EXISTS "Admins can view all deadlines" ON deadlines;
DROP POLICY IF EXISTS "Admins can create deadlines" ON deadlines;
DROP POLICY IF EXISTS "Admins can update deadlines" ON deadlines;
DROP POLICY IF EXISTS "Admins can delete deadlines" ON deadlines;

CREATE POLICY "Admins can view tenant deadlines" ON deadlines
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant deadlines" ON deadlines
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant deadlines" ON deadlines
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant deadlines" ON deadlines
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- LEADS_CAPTACAO
DROP POLICY IF EXISTS "Admins can view all leads" ON leads_captacao;
DROP POLICY IF EXISTS "Admins can create leads" ON leads_captacao;
DROP POLICY IF EXISTS "Admins can update leads" ON leads_captacao;
DROP POLICY IF EXISTS "Admins can delete leads" ON leads_captacao;

CREATE POLICY "Admins can view tenant leads" ON leads_captacao
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant leads" ON leads_captacao
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant leads" ON leads_captacao
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant leads" ON leads_captacao
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- OABS_CADASTRADAS
DROP POLICY IF EXISTS "Admins can manage all oabs" ON oabs_cadastradas;
DROP POLICY IF EXISTS "Admins can manage tenant oabs" ON oabs_cadastradas;

CREATE POLICY "Admins can view tenant oabs" ON oabs_cadastradas
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant oabs" ON oabs_cadastradas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant oabs" ON oabs_cadastradas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant oabs" ON oabs_cadastradas
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSOS_OAB
DROP POLICY IF EXISTS "Admins can manage all processos_oab" ON processos_oab;
DROP POLICY IF EXISTS "Admins can manage tenant processos_oab" ON processos_oab;

CREATE POLICY "Admins can view tenant processos_oab" ON processos_oab
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant processos_oab" ON processos_oab
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant processos_oab" ON processos_oab
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant processos_oab" ON processos_oab
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- MESSAGES
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

CREATE POLICY "Admins can view tenant messages" ON messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

CREATE POLICY "Admins can view tenant notifications" ON notifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- ============================================
-- FASE 2: CORRIGIR RLS DAS DEMAIS TABELAS
-- ============================================

-- DEADLINE_COMENTARIOS
DROP POLICY IF EXISTS "Admins can manage all deadline comentarios" ON deadline_comentarios;

CREATE POLICY "Admins can manage tenant deadline comentarios" ON deadline_comentarios
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- DEADLINE_TAGS
DROP POLICY IF EXISTS "Admins can manage all deadline tags" ON deadline_tags;

CREATE POLICY "Admins can manage tenant deadline tags" ON deadline_tags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- LEAD_COMMENTS
DROP POLICY IF EXISTS "Admins can manage all lead comments" ON lead_comments;

CREATE POLICY "Admins can manage tenant lead comments" ON lead_comments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- CONTROLADORIA_PROCESSOS
DROP POLICY IF EXISTS "Admins can manage all controladoria processos" ON controladoria_processos;

CREATE POLICY "Admins can manage tenant controladoria processos" ON controladoria_processos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- CLIENT_HISTORY
DROP POLICY IF EXISTS "Admins can view all client history" ON client_history;

CREATE POLICY "Admins can view tenant client history" ON client_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- CLIENTE_DOCUMENTOS
DROP POLICY IF EXISTS "Admins can view all client documents" ON cliente_documentos;
DROP POLICY IF EXISTS "Admins can create cliente documentos" ON cliente_documentos;
DROP POLICY IF EXISTS "Admins can update cliente documentos" ON cliente_documentos;
DROP POLICY IF EXISTS "Admins can delete cliente documentos" ON cliente_documentos;

CREATE POLICY "Admins can view tenant client documents" ON cliente_documentos
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can create tenant cliente documentos" ON cliente_documentos
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can update tenant cliente documentos" ON cliente_documentos
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete tenant cliente documentos" ON cliente_documentos
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- MESSAGE_ATTACHMENTS
DROP POLICY IF EXISTS "Admins can view all message attachments" ON message_attachments;

CREATE POLICY "Admins can view tenant message attachments" ON message_attachments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- BUSCA_PROCESSOS_OAB
DROP POLICY IF EXISTS "Admins can view all searches" ON busca_processos_oab;
DROP POLICY IF EXISTS "Controllers can view all searches" ON busca_processos_oab;

CREATE POLICY "Admins can view tenant searches" ON busca_processos_oab
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Controllers can view tenant searches" ON busca_processos_oab
  FOR SELECT USING (has_role(auth.uid(), 'controller'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIOES
DROP POLICY IF EXISTS "Admins can manage all reunioes" ON reunioes;

CREATE POLICY "Admins can manage tenant reunioes" ON reunioes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIAO_CLIENTES
DROP POLICY IF EXISTS "Admins can manage all reuniao clientes" ON reuniao_clientes;

CREATE POLICY "Admins can manage tenant reuniao clientes" ON reuniao_clientes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIAO_ARQUIVOS
DROP POLICY IF EXISTS "Admins can manage all reuniao arquivos" ON reuniao_arquivos;

CREATE POLICY "Admins can manage tenant reuniao arquivos" ON reuniao_arquivos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIAO_COMENTARIOS
DROP POLICY IF EXISTS "Admins can manage all reuniao comentarios" ON reuniao_comentarios;

CREATE POLICY "Admins can manage tenant reuniao comentarios" ON reuniao_comentarios
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIAO_CLIENTE_ARQUIVOS
DROP POLICY IF EXISTS "Admins can manage all reuniao cliente arquivos" ON reuniao_cliente_arquivos;

CREATE POLICY "Admins can manage tenant reuniao cliente arquivos" ON reuniao_cliente_arquivos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- REUNIAO_CLIENTE_COMENTARIOS
DROP POLICY IF EXISTS "Admins can manage all reuniao cliente comentarios" ON reuniao_cliente_comentarios;

CREATE POLICY "Admins can manage tenant reuniao cliente comentarios" ON reuniao_cliente_comentarios
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSOS
DROP POLICY IF EXISTS "Admins can manage all processos" ON processos;

CREATE POLICY "Admins can manage tenant processos" ON processos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_DOCUMENTOS
DROP POLICY IF EXISTS "Admins can manage all processo documentos" ON processo_documentos;

CREATE POLICY "Admins can manage tenant processo documentos" ON processo_documentos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_ETIQUETAS
DROP POLICY IF EXISTS "Admins can manage all processo etiquetas" ON processo_etiquetas;

CREATE POLICY "Admins can manage tenant processo etiquetas" ON processo_etiquetas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_HISTORICO
DROP POLICY IF EXISTS "Admins can manage all processo historico" ON processo_historico;

CREATE POLICY "Admins can manage tenant processo historico" ON processo_historico
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_MOVIMENTACOES
DROP POLICY IF EXISTS "Admins can manage all processo movimentacoes" ON processo_movimentacoes;

CREATE POLICY "Admins can manage tenant processo movimentacoes" ON processo_movimentacoes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_MONITORAMENTO_ESCAVADOR
DROP POLICY IF EXISTS "Admins can manage all monitoramento escavador" ON processo_monitoramento_escavador;

CREATE POLICY "Admins can manage tenant monitoramento escavador" ON processo_monitoramento_escavador
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_MONITORAMENTO_JUDIT
DROP POLICY IF EXISTS "Admins can manage all monitoramento judit" ON processo_monitoramento_judit;

CREATE POLICY "Admins can manage tenant monitoramento judit" ON processo_monitoramento_judit
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_ANDAMENTOS_JUDIT
DROP POLICY IF EXISTS "Admins can manage all andamentos judit" ON processo_andamentos_judit;

CREATE POLICY "Admins can manage tenant andamentos judit" ON processo_andamentos_judit
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_ATUALIZACOES_ESCAVADOR
DROP POLICY IF EXISTS "Admins can manage all atualizacoes escavador" ON processo_atualizacoes_escavador;

CREATE POLICY "Admins can manage tenant atualizacoes escavador" ON processo_atualizacoes_escavador
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSO_MOVIMENTACAO_CONFERENCIA
DROP POLICY IF EXISTS "Admins can manage all movimentacao conferencia" ON processo_movimentacao_conferencia;

CREATE POLICY "Admins can manage tenant movimentacao conferencia" ON processo_movimentacao_conferencia
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROJECT_COLUMNS
DROP POLICY IF EXISTS "Admins can manage all project columns" ON project_columns;

CREATE POLICY "Admins can manage tenant project columns" ON project_columns
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROJECT_SECTORS
DROP POLICY IF EXISTS "Admins can manage all project sectors" ON project_sectors;

CREATE POLICY "Admins can manage tenant project sectors" ON project_sectors
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROJECT_COLLABORATORS
DROP POLICY IF EXISTS "Admins can manage all project collaborators" ON project_collaborators;

CREATE POLICY "Admins can manage tenant project collaborators" ON project_collaborators
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- TASK_COMMENTS
DROP POLICY IF EXISTS "Admins can manage all task comments" ON task_comments;

CREATE POLICY "Admins can manage tenant task comments" ON task_comments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- TASK_FILES
DROP POLICY IF EXISTS "Admins can manage all task files" ON task_files;

CREATE POLICY "Admins can manage tenant task files" ON task_files
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSOS_OAB_ANDAMENTOS
DROP POLICY IF EXISTS "Admins can manage all processos_oab_andamentos" ON processos_oab_andamentos;

CREATE POLICY "Admins can manage tenant processos_oab_andamentos" ON processos_oab_andamentos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSOS_OAB_TAREFAS
DROP POLICY IF EXISTS "Admins can manage all processos_oab_tarefas" ON processos_oab_tarefas;

CREATE POLICY "Admins can manage tenant processos_oab_tarefas" ON processos_oab_tarefas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- PROCESSOS_OAB_ANEXOS
DROP POLICY IF EXISTS "Admins can manage all processos_oab_anexos" ON processos_oab_anexos;

CREATE POLICY "Admins can manage tenant processos_oab_anexos" ON processos_oab_anexos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- OAB_REQUEST_HISTORICO
DROP POLICY IF EXISTS "Admins can manage all oab_request_historico" ON oab_request_historico;

CREATE POLICY "Admins can manage tenant oab_request_historico" ON oab_request_historico
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());