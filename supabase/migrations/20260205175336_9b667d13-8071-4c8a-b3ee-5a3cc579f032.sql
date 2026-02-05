-- Adicionar colunas de juros e multa na tabela clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS aplicar_juros BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS taxa_juros_mensal NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aplicar_multa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS taxa_multa NUMERIC(5,2) DEFAULT 0;

-- Criar tabela de relacionamento cliente_etiquetas
CREATE TABLE IF NOT EXISTS cliente_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, etiqueta_id)
);

-- Habilitar RLS
ALTER TABLE cliente_etiquetas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cliente_etiquetas (4 políticas separadas)
CREATE POLICY "cliente_etiquetas_tenant_select" ON cliente_etiquetas
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "cliente_etiquetas_tenant_insert" ON cliente_etiquetas
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "cliente_etiquetas_tenant_update" ON cliente_etiquetas
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "cliente_etiquetas_tenant_delete" ON cliente_etiquetas
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Inserir etiquetas padrão para áreas jurídicas (globais, sem tenant_id)
INSERT INTO etiquetas (nome, cor, tenant_id) VALUES
  ('Trabalhista', '#3b82f6', NULL),
  ('Criminal', '#ef4444', NULL),
  ('Bancário', '#22c55e', NULL),
  ('Rural', '#84cc16', NULL),
  ('Cível', '#8b5cf6', NULL),
  ('Previdenciário', '#f59e0b', NULL),
  ('Tributário', '#06b6d4', NULL),
  ('Família', '#ec4899', NULL)
ON CONFLICT DO NOTHING;