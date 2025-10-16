-- FASE 3: Sistema de Conferência de Andamentos

-- 3.1: Adicionar coluna status_conferencia em processo_movimentacoes
ALTER TABLE processo_movimentacoes
ADD COLUMN IF NOT EXISTS status_conferencia TEXT DEFAULT 'pendente' 
CHECK (status_conferencia IN ('pendente', 'conferido', 'em_revisao'));

-- 3.2: Criar tabela de conferência de movimentações
CREATE TABLE IF NOT EXISTS processo_movimentacao_conferencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id UUID NOT NULL REFERENCES processo_movimentacoes(id) ON DELETE CASCADE,
  conferido BOOLEAN NOT NULL DEFAULT FALSE,
  conferido_por UUID REFERENCES auth.users(id),
  conferido_em TIMESTAMP WITH TIME ZONE,
  observacoes_conferencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(movimentacao_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_processo_movimentacoes_status_conferencia 
ON processo_movimentacoes(status_conferencia);

CREATE INDEX IF NOT EXISTS idx_processo_movimentacao_conferencia_movimentacao 
ON processo_movimentacao_conferencia(movimentacao_id);

CREATE INDEX IF NOT EXISTS idx_processo_movimentacao_conferencia_conferido_por 
ON processo_movimentacao_conferencia(conferido_por);

-- RLS para processo_movimentacao_conferencia
ALTER TABLE processo_movimentacao_conferencia ENABLE ROW LEVEL SECURITY;

-- Controllers e Admins podem gerenciar conferências
CREATE POLICY "Controllers can manage conferencias"
ON processo_movimentacao_conferencia
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'controller'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Usuários podem ver conferências dos seus processos
CREATE POLICY "Users can view conferencias of their processos"
ON processo_movimentacao_conferencia
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM processo_movimentacoes pm
    JOIN processos p ON p.id = pm.processo_id
    WHERE pm.id = processo_movimentacao_conferencia.movimentacao_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_processo_movimentacao_conferencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_processo_movimentacao_conferencia_updated_at
BEFORE UPDATE ON processo_movimentacao_conferencia
FOR EACH ROW
EXECUTE FUNCTION update_processo_movimentacao_conferencia_updated_at();

-- Trigger para registrar auditoria ao conferir (INSERT)
CREATE OR REPLACE FUNCTION registrar_conferencia_audit_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conferido = TRUE THEN
    INSERT INTO processo_historico (
      processo_id,
      acao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      user_id
    )
    SELECT 
      pm.processo_id,
      'Andamento conferido',
      'status_conferencia',
      'pendente',
      'conferido',
      NEW.conferido_por
    FROM processo_movimentacoes pm
    WHERE pm.id = NEW.movimentacao_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para registrar auditoria ao conferir (UPDATE)
CREATE OR REPLACE FUNCTION registrar_conferencia_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.conferido IS DISTINCT FROM NEW.conferido AND NEW.conferido = TRUE THEN
    INSERT INTO processo_historico (
      processo_id,
      acao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      user_id
    )
    SELECT 
      pm.processo_id,
      'Andamento conferido',
      'status_conferencia',
      'pendente',
      'conferido',
      NEW.conferido_por
    FROM processo_movimentacoes pm
    WHERE pm.id = NEW.movimentacao_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_registrar_conferencia_audit_insert
AFTER INSERT ON processo_movimentacao_conferencia
FOR EACH ROW
EXECUTE FUNCTION registrar_conferencia_audit_insert();

CREATE TRIGGER trigger_registrar_conferencia_audit_update
AFTER UPDATE ON processo_movimentacao_conferencia
FOR EACH ROW
EXECUTE FUNCTION registrar_conferencia_audit_update();