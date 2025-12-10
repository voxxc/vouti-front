-- =====================================================
-- FASE 21: Atualizar tabelas que faltam com tenant isolation
-- =====================================================

-- Reunioes (a politica foi criada mas precisamos restaurar)
DROP POLICY IF EXISTS "Admins can view reunioes in tenant" ON reunioes;
DROP POLICY IF EXISTS "Admins can create reunioes in tenant" ON reunioes;
DROP POLICY IF EXISTS "Admins can update reunioes in tenant" ON reunioes;
DROP POLICY IF EXISTS "Admins can delete reunioes in tenant" ON reunioes;

CREATE POLICY "Admins can view reunioes in tenant" ON reunioes
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can create reunioes in tenant" ON reunioes
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can update reunioes in tenant" ON reunioes
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can delete reunioes in tenant" ON reunioes
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Clientes
DROP POLICY IF EXISTS "Admins can view reuniao clientes in tenant" ON reuniao_clientes;
DROP POLICY IF EXISTS "Admins can create reuniao clientes in tenant" ON reuniao_clientes;
DROP POLICY IF EXISTS "Admins can update reuniao clientes in tenant" ON reuniao_clientes;
DROP POLICY IF EXISTS "Admins can delete reuniao clientes in tenant" ON reuniao_clientes;

CREATE POLICY "Admins can view reuniao clientes in tenant" ON reuniao_clientes
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can create reuniao clientes in tenant" ON reuniao_clientes
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can update reuniao clientes in tenant" ON reuniao_clientes
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Admins can delete reuniao clientes in tenant" ON reuniao_clientes
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processos OAB
DROP POLICY IF EXISTS "Admins can manage processos_oab in tenant" ON processos_oab;

CREATE POLICY "Admins can manage processos_oab in tenant" ON processos_oab
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- OABs Cadastradas
DROP POLICY IF EXISTS "Admins can manage oabs in tenant" ON oabs_cadastradas;

CREATE POLICY "Admins can manage oabs in tenant" ON oabs_cadastradas
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processos OAB Andamentos
DROP POLICY IF EXISTS "Admins can manage andamentos in tenant" ON processos_oab_andamentos;

CREATE POLICY "Admins can manage andamentos in tenant" ON processos_oab_andamentos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processos OAB Tarefas
DROP POLICY IF EXISTS "Admins can manage tarefas in tenant" ON processos_oab_tarefas;

CREATE POLICY "Admins can manage tarefas in tenant" ON processos_oab_tarefas
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processos OAB Anexos
DROP POLICY IF EXISTS "Admins can manage anexos in tenant" ON processos_oab_anexos;

CREATE POLICY "Admins can manage anexos in tenant" ON processos_oab_anexos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Project Columns
DROP POLICY IF EXISTS "Admins can manage columns in tenant" ON project_columns;

CREATE POLICY "Admins can manage columns in tenant" ON project_columns
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Project Collaborators
DROP POLICY IF EXISTS "Admins can manage collaborators in tenant" ON project_collaborators;

CREATE POLICY "Admins can manage collaborators in tenant" ON project_collaborators
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Project Sectors
DROP POLICY IF EXISTS "Admins can manage sectors in tenant" ON project_sectors;

CREATE POLICY "Admins can manage sectors in tenant" ON project_sectors
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Sector Templates
DROP POLICY IF EXISTS "Admins can manage templates in tenant" ON sector_templates;

CREATE POLICY "Admins can manage templates in tenant" ON sector_templates
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Task Files
DROP POLICY IF EXISTS "Admins can manage task files in tenant" ON task_files;

CREATE POLICY "Admins can manage task files in tenant" ON task_files
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Task Comments
DROP POLICY IF EXISTS "Admins can manage task comments in tenant" ON task_comments;

CREATE POLICY "Admins can manage task comments in tenant" ON task_comments
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Arquivos
DROP POLICY IF EXISTS "Admins can manage reuniao arquivos in tenant" ON reuniao_arquivos;

CREATE POLICY "Admins can manage reuniao arquivos in tenant" ON reuniao_arquivos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Cliente Arquivos
DROP POLICY IF EXISTS "Admins can manage reuniao cliente arquivos in tenant" ON reuniao_cliente_arquivos;

CREATE POLICY "Admins can manage reuniao cliente arquivos in tenant" ON reuniao_cliente_arquivos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Comentarios
DROP POLICY IF EXISTS "Admins can manage reuniao comentarios in tenant" ON reuniao_comentarios;

CREATE POLICY "Admins can manage reuniao comentarios in tenant" ON reuniao_comentarios
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Cliente Comentarios
DROP POLICY IF EXISTS "Admins can manage reuniao cliente comentarios in tenant" ON reuniao_cliente_comentarios;

CREATE POLICY "Admins can manage reuniao cliente comentarios in tenant" ON reuniao_cliente_comentarios
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- OAB Request Historico
DROP POLICY IF EXISTS "Admins can view oab request historico in tenant" ON oab_request_historico;

CREATE POLICY "Admins can view oab request historico in tenant" ON oab_request_historico
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Monitoramento Judit
DROP POLICY IF EXISTS "Admins can manage monitoramento judit in tenant" ON processo_monitoramento_judit;

CREATE POLICY "Admins can manage monitoramento judit in tenant" ON processo_monitoramento_judit
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Andamentos Judit
DROP POLICY IF EXISTS "Admins can manage andamentos judit in tenant" ON processo_andamentos_judit;

CREATE POLICY "Admins can manage andamentos judit in tenant" ON processo_andamentos_judit
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Reuniao Status
DROP POLICY IF EXISTS "Admins can manage reuniao status in tenant" ON reuniao_status;

CREATE POLICY "Admins can manage reuniao status in tenant" ON reuniao_status
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processos (tabela principal)
DROP POLICY IF EXISTS "Admins can manage processos in tenant" ON processos;

CREATE POLICY "Admins can manage processos in tenant" ON processos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Documentos
DROP POLICY IF EXISTS "Admins can manage processo documentos in tenant" ON processo_documentos;

CREATE POLICY "Admins can manage processo documentos in tenant" ON processo_documentos
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Historico
DROP POLICY IF EXISTS "Admins can view processo historico in tenant" ON processo_historico;

CREATE POLICY "Admins can view processo historico in tenant" ON processo_historico
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Movimentacoes
DROP POLICY IF EXISTS "Admins can manage processo movimentacoes in tenant" ON processo_movimentacoes;

CREATE POLICY "Admins can manage processo movimentacoes in tenant" ON processo_movimentacoes
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Processo Etiquetas
DROP POLICY IF EXISTS "Admins can manage processo etiquetas in tenant" ON processo_etiquetas;

CREATE POLICY "Admins can manage processo etiquetas in tenant" ON processo_etiquetas
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Tribunais
DROP POLICY IF EXISTS "Admins can manage tribunais in tenant" ON tribunais;

CREATE POLICY "Admins can manage tribunais in tenant" ON tribunais
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Tipos Acao
DROP POLICY IF EXISTS "Admins can manage tipos acao in tenant" ON tipos_acao;

CREATE POLICY "Admins can manage tipos acao in tenant" ON tipos_acao
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_user_tenant_id()
);