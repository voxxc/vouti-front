-- =============================================
-- FASE 1: REMOVER POLÍTICAS RLS CONFLITANTES
-- (Políticas que não filtram por tenant_id)
-- =============================================

-- projects
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins can create projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can link any client to projects" ON projects;
DROP POLICY IF EXISTS "Project owners and admins can delete projects" ON projects;

-- oabs_cadastradas
DROP POLICY IF EXISTS "Admins can manage all OABs" ON oabs_cadastradas;

-- processos_oab
DROP POLICY IF EXISTS "Admins can manage all processes" ON processos_oab;

-- processos
DROP POLICY IF EXISTS "Admins can view all processos" ON processos;
DROP POLICY IF EXISTS "Admins can update all processos" ON processos;
DROP POLICY IF EXISTS "Admins can delete all processos" ON processos;
DROP POLICY IF EXISTS "Controllers can view all processos" ON processos;
DROP POLICY IF EXISTS "Controllers can update all processos" ON processos;
DROP POLICY IF EXISTS "Controllers can delete all processos" ON processos;

-- notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- sector_templates
DROP POLICY IF EXISTS "Admins can manage all sector templates" ON sector_templates;

-- tasks
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can update all tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- task_comments
DROP POLICY IF EXISTS "Admins can manage all task comments" ON task_comments;

-- task_files
DROP POLICY IF EXISTS "Admins can manage all task files" ON task_files;

-- processos_oab_andamentos
DROP POLICY IF EXISTS "Admins can manage all OAB andamentos" ON processos_oab_andamentos;

-- processos_oab_tarefas
DROP POLICY IF EXISTS "Admins can manage all OAB tarefas" ON processos_oab_tarefas;

-- processos_oab_anexos
DROP POLICY IF EXISTS "Admins can manage all OAB anexos" ON processos_oab_anexos;

-- reuniao_comentarios
DROP POLICY IF EXISTS "Admins can manage all reuniao comments" ON reuniao_comentarios;

-- reuniao_cliente_arquivos
DROP POLICY IF EXISTS "Admins can manage all cliente arquivos" ON reuniao_cliente_arquivos;

-- reuniao_cliente_comentarios
DROP POLICY IF EXISTS "Admins can manage all cliente comentarios" ON reuniao_cliente_comentarios;

-- processo_monitoramento_escavador
DROP POLICY IF EXISTS "Admins can manage all monitoring" ON processo_monitoramento_escavador;

-- processo_atualizacoes_escavador
DROP POLICY IF EXISTS "Admins can manage all updates" ON processo_atualizacoes_escavador;

-- tipos_acao
DROP POLICY IF EXISTS "Admins can manage all tipos_acao" ON tipos_acao;

-- cliente_pagamento_comentarios (already has correct policies, just ensuring no conflicts)
DROP POLICY IF EXISTS "Admins can view all payment comments" ON cliente_pagamento_comentarios;

-- =============================================
-- FASE 2: CRIAR TABELAS PUSH-DOC (CNPJs)
-- =============================================

-- Tabela para CNPJs cadastrados (similar a oabs_cadastradas)
CREATE TABLE IF NOT EXISTS cnpjs_cadastrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  ultimo_request_id TEXT,
  request_id_data TIMESTAMPTZ,
  ultima_sincronizacao TIMESTAMPTZ,
  total_processos INTEGER DEFAULT 0,
  ordem INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cnpj, tenant_id)
);

-- Tabela para processos encontrados por CNPJ (similar a processos_oab)
CREATE TABLE IF NOT EXISTS processos_cnpj (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_id UUID NOT NULL REFERENCES cnpjs_cadastrados(id) ON DELETE CASCADE,
  numero_cnj TEXT NOT NULL,
  parte_tipo TEXT,
  parte_ativa TEXT,
  parte_passiva TEXT,
  partes_completas JSONB,
  tribunal TEXT,
  tribunal_sigla TEXT,
  estado TEXT,
  cidade TEXT,
  juizo TEXT,
  instancia TEXT,
  status_processual TEXT,
  fase_processual TEXT,
  valor_causa NUMERIC,
  data_distribuicao DATE,
  area_direito TEXT,
  assunto TEXT,
  classificacao TEXT,
  link_tribunal TEXT,
  ultimo_andamento TEXT,
  ultimo_andamento_data TIMESTAMPTZ,
  capa_completa JSONB,
  detalhes_request_id TEXT,
  detalhes_request_data TIMESTAMPTZ,
  monitoramento_ativo BOOLEAN DEFAULT false,
  tracking_id TEXT,
  importado_manualmente BOOLEAN DEFAULT false,
  ordem INTEGER,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para andamentos de processos CNPJ (similar a processos_oab_andamentos)
CREATE TABLE IF NOT EXISTS processos_cnpj_andamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_cnpj_id UUID NOT NULL REFERENCES processos_cnpj(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data_movimentacao TIMESTAMPTZ,
  tipo_movimentacao TEXT,
  dados_completos JSONB,
  lida BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cnpjs_cadastrados_tenant ON cnpjs_cadastrados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cnpjs_cadastrados_user ON cnpjs_cadastrados(user_id);
CREATE INDEX IF NOT EXISTS idx_processos_cnpj_cnpj_id ON processos_cnpj(cnpj_id);
CREATE INDEX IF NOT EXISTS idx_processos_cnpj_tenant ON processos_cnpj(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processos_cnpj_andamentos_processo ON processos_cnpj_andamentos(processo_cnpj_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cnpjs_cadastrados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cnpjs_cadastrados_updated_at ON cnpjs_cadastrados;
CREATE TRIGGER update_cnpjs_cadastrados_updated_at
  BEFORE UPDATE ON cnpjs_cadastrados
  FOR EACH ROW
  EXECUTE FUNCTION update_cnpjs_cadastrados_updated_at();

CREATE OR REPLACE FUNCTION update_processos_cnpj_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_processos_cnpj_updated_at ON processos_cnpj;
CREATE TRIGGER update_processos_cnpj_updated_at
  BEFORE UPDATE ON processos_cnpj
  FOR EACH ROW
  EXECUTE FUNCTION update_processos_cnpj_updated_at();

-- =============================================
-- RLS POLICIES PARA PUSH-DOC (COM TENANT_ID)
-- =============================================

ALTER TABLE cnpjs_cadastrados ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_cnpj ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_cnpj_andamentos ENABLE ROW LEVEL SECURITY;

-- cnpjs_cadastrados
CREATE POLICY "Users can manage their own CNPJs"
  ON cnpjs_cadastrados FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage tenant CNPJs"
  ON cnpjs_cadastrados FOR ALL
  USING (has_role(auth.uid(), 'admin') AND tenant_id = get_user_tenant_id());

CREATE POLICY "Controllers can view tenant CNPJs"
  ON cnpjs_cadastrados FOR SELECT
  USING (has_role(auth.uid(), 'controller') AND tenant_id = get_user_tenant_id());

-- processos_cnpj
CREATE POLICY "Users can manage their own CNPJ processes"
  ON processos_cnpj FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage tenant CNPJ processes"
  ON processos_cnpj FOR ALL
  USING (has_role(auth.uid(), 'admin') AND tenant_id = get_user_tenant_id());

CREATE POLICY "Controllers can view tenant CNPJ processes"
  ON processos_cnpj FOR SELECT
  USING (has_role(auth.uid(), 'controller') AND tenant_id = get_user_tenant_id());

-- processos_cnpj_andamentos
CREATE POLICY "Users can manage their own CNPJ andamentos"
  ON processos_cnpj_andamentos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM processos_cnpj pc
    WHERE pc.id = processos_cnpj_andamentos.processo_cnpj_id
    AND pc.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage tenant CNPJ andamentos"
  ON processos_cnpj_andamentos FOR ALL
  USING (has_role(auth.uid(), 'admin') AND tenant_id = get_user_tenant_id());

CREATE POLICY "Controllers can view tenant CNPJ andamentos"
  ON processos_cnpj_andamentos FOR SELECT
  USING (has_role(auth.uid(), 'controller') AND tenant_id = get_user_tenant_id());