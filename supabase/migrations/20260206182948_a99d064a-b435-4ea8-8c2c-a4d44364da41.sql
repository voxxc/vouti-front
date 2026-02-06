-- Tabela principal para cadastro de documentos monitorados
CREATE TABLE push_docs_cadastrados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Tipo de documento: 'cpf', 'cnpj', 'oab'
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('cpf', 'cnpj', 'oab')),
  
  -- Valor do documento (CPF limpo, CNPJ limpo, ou OAB no formato "92124PR")
  documento TEXT NOT NULL,
  
  -- Descricao opcional (nome da pessoa, razao social, nome advogado)
  descricao TEXT,
  
  -- Campos de tracking Judit
  tracking_id TEXT,
  tracking_status TEXT DEFAULT 'pendente' CHECK (tracking_status IN ('pendente', 'ativo', 'pausado', 'erro', 'deletado')),
  ultimo_request_id TEXT,
  
  -- Configuracoes de monitoramento
  recurrence INTEGER DEFAULT 1,
  notification_emails TEXT[],
  
  -- Estatisticas
  total_processos_recebidos INTEGER DEFAULT 0,
  ultima_notificacao TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, tipo_documento, documento)
);

-- Indexes para performance
CREATE INDEX idx_push_docs_tenant_id ON push_docs_cadastrados(tenant_id);
CREATE INDEX idx_push_docs_tracking_id ON push_docs_cadastrados(tracking_id);

-- RLS
ALTER TABLE push_docs_cadastrados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all push docs"
  ON push_docs_cadastrados FOR ALL
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can view their push docs"
  ON push_docs_cadastrados FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_push_docs_cadastrados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_push_docs_cadastrados_updated_at
  BEFORE UPDATE ON push_docs_cadastrados
  FOR EACH ROW
  EXECUTE FUNCTION update_push_docs_cadastrados_updated_at();

-- Tabela para processos recebidos via webhook
CREATE TABLE push_docs_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_doc_id UUID NOT NULL REFERENCES push_docs_cadastrados(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dados do processo
  numero_cnj TEXT NOT NULL,
  tribunal TEXT,
  tribunal_sigla TEXT,
  parte_ativa TEXT,
  parte_passiva TEXT,
  status_processual TEXT,
  data_distribuicao TEXT,
  valor_causa NUMERIC,
  
  -- Dados completos do webhook
  payload_completo JSONB,
  
  -- Request que trouxe o processo
  request_id TEXT,
  tracking_id TEXT,
  
  -- Status de visualizacao
  lido BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(push_doc_id, numero_cnj)
);

CREATE INDEX idx_push_docs_processos_push_doc ON push_docs_processos(push_doc_id);
CREATE INDEX idx_push_docs_processos_tenant ON push_docs_processos(tenant_id);

ALTER TABLE push_docs_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all push docs processos"
  ON push_docs_processos FOR ALL
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can view their push docs processos"
  ON push_docs_processos FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- Adicionar novos tipos ao check constraint de tenant_banco_ids
ALTER TABLE tenant_banco_ids DROP CONSTRAINT IF EXISTS tenant_banco_ids_tipo_check;
ALTER TABLE tenant_banco_ids ADD CONSTRAINT tenant_banco_ids_tipo_check 
  CHECK (tipo IN ('oab', 'processo', 'tracking', 'tracking_desativado', 'request_busca', 'request_detalhes', 'push_doc', 'tracking_push_doc'));

-- Trigger para registrar push_docs no Banco de IDs
CREATE OR REPLACE FUNCTION registrar_banco_id_push_doc()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: registrar push_doc
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'push_doc',
      NEW.id,
      NEW.id::text,
      UPPER(NEW.tipo_documento) || ': ' || NEW.documento || COALESCE(' - ' || NEW.descricao, ''),
      jsonb_build_object('tipo_documento', NEW.tipo_documento, 'documento', NEW.documento)
    );
  END IF;
  
  -- UPDATE: registrar tracking_id quando ativado
  IF TG_OP = 'UPDATE' AND NEW.tracking_id IS DISTINCT FROM OLD.tracking_id AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking_push_doc',
      NEW.id,
      NEW.tracking_id,
      'Tracking ' || UPPER(NEW.tipo_documento) || ': ' || NEW.documento,
      jsonb_build_object('tipo_documento', NEW.tipo_documento, 'documento', NEW.documento, 'status', NEW.tracking_status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_push_docs_banco_ids
  AFTER INSERT OR UPDATE ON push_docs_cadastrados
  FOR EACH ROW
  EXECUTE FUNCTION registrar_banco_id_push_doc();