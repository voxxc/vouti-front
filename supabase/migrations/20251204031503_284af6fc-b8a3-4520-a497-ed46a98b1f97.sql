-- Tabela de OABs cadastradas
CREATE TABLE oabs_cadastradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oab_numero TEXT NOT NULL,
  oab_uf TEXT NOT NULL,
  nome_advogado TEXT,
  ordem INTEGER DEFAULT 0,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  ultima_sincronizacao TIMESTAMPTZ,
  total_processos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(oab_numero, oab_uf, user_id)
);

-- Tabela de processos vinculados a uma OAB
CREATE TABLE processos_oab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oab_id UUID NOT NULL REFERENCES oabs_cadastradas(id) ON DELETE CASCADE,
  numero_cnj TEXT NOT NULL,
  tribunal TEXT,
  tribunal_sigla TEXT,
  parte_ativa TEXT,
  parte_passiva TEXT,
  partes_completas JSONB,
  status_processual TEXT,
  fase_processual TEXT,
  data_distribuicao DATE,
  valor_causa NUMERIC,
  juizo TEXT,
  link_tribunal TEXT,
  capa_completa JSONB,
  detalhes_completos JSONB,
  detalhes_carregados BOOLEAN DEFAULT false,
  ordem_lista INTEGER DEFAULT 0,
  monitoramento_ativo BOOLEAN DEFAULT false,
  tracking_id TEXT,
  ultima_atualizacao_detalhes TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id),
  UNIQUE(oab_id, numero_cnj)
);

-- Tabela de andamentos dos processos
CREATE TABLE processos_oab_andamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id UUID NOT NULL REFERENCES processos_oab(id) ON DELETE CASCADE,
  data_movimentacao TIMESTAMPTZ,
  tipo_movimentacao TEXT,
  descricao TEXT NOT NULL,
  dados_completos JSONB,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id)
);

-- Indices para performance
CREATE INDEX idx_oabs_cadastradas_user ON oabs_cadastradas(user_id);
CREATE INDEX idx_processos_oab_oab_id ON processos_oab(oab_id);
CREATE INDEX idx_processos_oab_numero_cnj ON processos_oab(numero_cnj);
CREATE INDEX idx_processos_oab_andamentos_processo ON processos_oab_andamentos(processo_oab_id);
CREATE INDEX idx_processos_oab_andamentos_lida ON processos_oab_andamentos(lida) WHERE lida = false;

-- RLS para oabs_cadastradas
ALTER TABLE oabs_cadastradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OABs"
ON oabs_cadastradas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OABs"
ON oabs_cadastradas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OABs"
ON oabs_cadastradas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OABs"
ON oabs_cadastradas FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all OABs"
ON oabs_cadastradas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS para processos_oab
ALTER TABLE processos_oab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processes of their OABs"
ON processos_oab FOR SELECT
USING (EXISTS (
  SELECT 1 FROM oabs_cadastradas o
  WHERE o.id = processos_oab.oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can create processes for their OABs"
ON processos_oab FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM oabs_cadastradas o
  WHERE o.id = processos_oab.oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can update processes of their OABs"
ON processos_oab FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM oabs_cadastradas o
  WHERE o.id = processos_oab.oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can delete processes of their OABs"
ON processos_oab FOR DELETE
USING (EXISTS (
  SELECT 1 FROM oabs_cadastradas o
  WHERE o.id = processos_oab.oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all processes"
ON processos_oab FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS para processos_oab_andamentos
ALTER TABLE processos_oab_andamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view andamentos of their processes"
ON processos_oab_andamentos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM processos_oab p
  JOIN oabs_cadastradas o ON o.id = p.oab_id
  WHERE p.id = processos_oab_andamentos.processo_oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can create andamentos for their processes"
ON processos_oab_andamentos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM processos_oab p
  JOIN oabs_cadastradas o ON o.id = p.oab_id
  WHERE p.id = processos_oab_andamentos.processo_oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Users can update andamentos of their processes"
ON processos_oab_andamentos FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM processos_oab p
  JOIN oabs_cadastradas o ON o.id = p.oab_id
  WHERE p.id = processos_oab_andamentos.processo_oab_id AND o.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all andamentos"
ON processos_oab_andamentos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_oabs_cadastradas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oabs_cadastradas_updated_at
BEFORE UPDATE ON oabs_cadastradas
FOR EACH ROW
EXECUTE FUNCTION update_oabs_cadastradas_updated_at();

CREATE OR REPLACE FUNCTION update_processos_oab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_processos_oab_updated_at
BEFORE UPDATE ON processos_oab
FOR EACH ROW
EXECUTE FUNCTION update_processos_oab_updated_at();