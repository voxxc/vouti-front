-- Criar tabela de status customizáveis para reuniões
CREATE TABLE IF NOT EXISTS reuniao_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir status padrão
INSERT INTO reuniao_status (nome, cor, ordem, is_default, ativo) VALUES
  ('1ª reunião', '#3b82f6', 1, true, true),
  ('em contato', '#eab308', 2, true, true),
  ('inviável', '#ef4444', 3, true, true),
  ('fechado', '#22c55e', 4, true, true)
ON CONFLICT (nome) DO NOTHING;

-- Adicionar coluna status_id na tabela reunioes
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES reuniao_status(id);

-- Migrar dados existentes de status para status_id
UPDATE reunioes r
SET status_id = (SELECT id FROM reuniao_status WHERE nome = r.status)
WHERE status_id IS NULL AND status IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_reuniao_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reuniao_status_updated_at
  BEFORE UPDATE ON reuniao_status
  FOR EACH ROW
  EXECUTE FUNCTION update_reuniao_status_updated_at();

-- RLS Policies para reuniao_status
ALTER TABLE reuniao_status ENABLE ROW LEVEL SECURITY;

-- Todos podem ver status ativos
CREATE POLICY "Todos podem ver status ativos"
  ON reuniao_status FOR SELECT
  USING (ativo = true);

-- Admins podem gerenciar todos os status
CREATE POLICY "Admins podem gerenciar status"
  ON reuniao_status FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));