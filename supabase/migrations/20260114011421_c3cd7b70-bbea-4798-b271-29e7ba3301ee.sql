-- Criar tabela de protocolos do projeto
CREATE TABLE project_protocolos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  responsavel_id UUID,
  data_inicio TIMESTAMPTZ DEFAULT now(),
  data_previsao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

-- Criar tabela de etapas do protocolo
CREATE TABLE project_protocolo_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES project_protocolos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  ordem INTEGER DEFAULT 0,
  responsavel_id UUID,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

-- Índices para performance
CREATE INDEX idx_project_protocolos_project ON project_protocolos(project_id);
CREATE INDEX idx_project_protocolos_tenant ON project_protocolos(tenant_id);
CREATE INDEX idx_project_protocolos_status ON project_protocolos(status);
CREATE INDEX idx_project_protocolo_etapas_protocolo ON project_protocolo_etapas(protocolo_id);
CREATE INDEX idx_project_protocolo_etapas_tenant ON project_protocolo_etapas(tenant_id);

-- Habilitar RLS
ALTER TABLE project_protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_protocolo_etapas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para protocolos
CREATE POLICY "Users can view protocolos of their tenant"
ON project_protocolos FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert protocolos in their tenant"
ON project_protocolos FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update protocolos of their tenant"
ON project_protocolos FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete protocolos of their tenant"
ON project_protocolos FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

-- Políticas RLS para etapas
CREATE POLICY "Users can view etapas of their tenant"
ON project_protocolo_etapas FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert etapas in their tenant"
ON project_protocolo_etapas FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update etapas of their tenant"
ON project_protocolo_etapas FOR UPDATE
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete etapas of their tenant"
ON project_protocolo_etapas FOR DELETE
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_project_protocolos_updated_at
BEFORE UPDATE ON project_protocolos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_protocolo_etapas_updated_at
BEFORE UPDATE ON project_protocolo_etapas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();