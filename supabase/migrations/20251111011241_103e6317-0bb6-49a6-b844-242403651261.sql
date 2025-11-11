-- Tabela: processo_monitoramento_escavador
CREATE TABLE processo_monitoramento_escavador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  
  -- Controle de monitoramento
  monitoramento_ativo BOOLEAN DEFAULT false,
  callback_id TEXT,
  
  -- Dados do processo retornados pela Escavador
  escavador_id TEXT,
  escavador_data JSONB,
  
  -- Informações extraídas
  classe TEXT,
  assunto TEXT,
  area TEXT,
  tribunal TEXT,
  data_distribuicao TIMESTAMP WITH TIME ZONE,
  valor_causa NUMERIC,
  
  -- Metadados
  ultima_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE,
  total_atualizacoes INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(processo_id)
);

CREATE INDEX idx_monitoramento_processo ON processo_monitoramento_escavador(processo_id);
CREATE INDEX idx_monitoramento_ativo ON processo_monitoramento_escavador(monitoramento_ativo);
CREATE INDEX idx_monitoramento_callback ON processo_monitoramento_escavador(callback_id);

-- Tabela: processo_atualizacoes_escavador
CREATE TABLE processo_atualizacoes_escavador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  monitoramento_id UUID REFERENCES processo_monitoramento_escavador(id) ON DELETE CASCADE,
  
  -- Dados da atualização
  tipo_atualizacao TEXT,
  descricao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE,
  dados_completos JSONB,
  
  -- Controle
  lida BOOLEAN DEFAULT false,
  notificacao_enviada BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_atualizacoes_processo ON processo_atualizacoes_escavador(processo_id);
CREATE INDEX idx_atualizacoes_monitoramento ON processo_atualizacoes_escavador(monitoramento_id);
CREATE INDEX idx_atualizacoes_lida ON processo_atualizacoes_escavador(lida);

-- RLS para processo_monitoramento_escavador
ALTER TABLE processo_monitoramento_escavador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all monitoramento"
  ON processo_monitoramento_escavador FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Controllers can view all monitoramento"
  ON processo_monitoramento_escavador FOR SELECT
  USING (has_role(auth.uid(), 'controller'::app_role));

CREATE POLICY "Users can manage monitoramento of their processos"
  ON processo_monitoramento_escavador FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM processos p 
      WHERE p.id = processo_monitoramento_escavador.processo_id 
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

-- RLS para processo_atualizacoes_escavador
ALTER TABLE processo_atualizacoes_escavador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all atualizacoes"
  ON processo_atualizacoes_escavador FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view atualizacoes of their processos"
  ON processo_atualizacoes_escavador FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processos p 
      WHERE p.id = processo_atualizacoes_escavador.processo_id 
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their atualizacoes as read"
  ON processo_atualizacoes_escavador FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM processos p 
      WHERE p.id = processo_atualizacoes_escavador.processo_id 
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
    )
  );