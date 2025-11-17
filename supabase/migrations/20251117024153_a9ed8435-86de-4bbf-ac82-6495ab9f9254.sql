-- Tabela para armazenar informações de monitoramento Judit
CREATE TABLE IF NOT EXISTS processo_monitoramento_judit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  monitoramento_ativo BOOLEAN DEFAULT false,
  tracking_id TEXT,
  recurrence INTEGER DEFAULT 1,
  judit_data JSONB,
  ultimo_request_id TEXT,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE,
  total_movimentacoes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(processo_id)
);

-- Tabela para armazenar andamentos processuais da Judit
CREATE TABLE IF NOT EXISTS processo_andamentos_judit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  monitoramento_id UUID REFERENCES processo_monitoramento_judit(id) ON DELETE CASCADE,
  tipo_movimentacao TEXT,
  descricao TEXT NOT NULL,
  data_movimentacao TIMESTAMP WITH TIME ZONE,
  dados_completos JSONB,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processo_monitoramento_judit_processo_id ON processo_monitoramento_judit(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_monitoramento_judit_ativo ON processo_monitoramento_judit(monitoramento_ativo);
CREATE INDEX IF NOT EXISTS idx_processo_andamentos_judit_processo_id ON processo_andamentos_judit(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_andamentos_judit_lida ON processo_andamentos_judit(lida);
CREATE INDEX IF NOT EXISTS idx_processo_andamentos_judit_data ON processo_andamentos_judit(data_movimentacao DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_processo_monitoramento_judit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processo_monitoramento_judit_updated_at
  BEFORE UPDATE ON processo_monitoramento_judit
  FOR EACH ROW
  EXECUTE FUNCTION update_processo_monitoramento_judit_updated_at();

-- RLS Policies para processo_monitoramento_judit
ALTER TABLE processo_monitoramento_judit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all monitoramento judit"
  ON processo_monitoramento_judit FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Controllers can view all monitoramento judit"
  ON processo_monitoramento_judit FOR SELECT
  USING (has_role(auth.uid(), 'controller'::app_role));

CREATE POLICY "Users can view their processo monitoramento"
  ON processo_monitoramento_judit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_monitoramento_judit.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their processo monitoramento"
  ON processo_monitoramento_judit FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_monitoramento_judit.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

CREATE POLICY "System can insert monitoramento"
  ON processo_monitoramento_judit FOR INSERT
  WITH CHECK (true);

-- RLS Policies para processo_andamentos_judit
ALTER TABLE processo_andamentos_judit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all andamentos judit"
  ON processo_andamentos_judit FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Controllers can view all andamentos judit"
  ON processo_andamentos_judit FOR SELECT
  USING (has_role(auth.uid(), 'controller'::app_role));

CREATE POLICY "Users can view their processo andamentos"
  ON processo_andamentos_judit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_andamentos_judit.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their andamentos as read"
  ON processo_andamentos_judit FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM processos p
      WHERE p.id = processo_andamentos_judit.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

CREATE POLICY "System can insert andamentos"
  ON processo_andamentos_judit FOR INSERT
  WITH CHECK (true);