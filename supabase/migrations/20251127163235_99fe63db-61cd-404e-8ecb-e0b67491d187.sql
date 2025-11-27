-- =============================================
-- FASE 1: Adicionar tenant_id às tabelas do sistema jurídico
-- =============================================

-- Adicionar coluna tenant_id às tabelas principais
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE cliente_parcelas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE cliente_dividas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE cliente_documentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE cliente_pagamento_comentarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE project_sectors ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE project_columns ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE project_collaborators ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE task_files ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE deadline_comentarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE deadline_tags ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_movimentacoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_documentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_historico ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_etiquetas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_monitoramento_judit ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_andamentos_judit ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_monitoramento_escavador ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_atualizacoes_escavador ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE processo_movimentacao_conferencia ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE etiquetas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE grupos_acoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE leads_captacao ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE lead_comments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE client_history ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE controladoria_processos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE busca_processos_oab ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_clientes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_comentarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_arquivos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_cliente_comentarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_cliente_arquivos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE reuniao_status ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE sector_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE tribunais ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE comarcas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE tipos_acao ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_tenant ON deadlines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processos_tenant ON processos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_captacao_tenant ON leads_captacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_tenant ON reunioes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reuniao_clientes_tenant ON reuniao_clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);

-- Criar função helper para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Criar função helper para verificar se usuário pertence ao tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id
  )
$$;