-- ==================== ENUMS ====================
CREATE TYPE processo_status AS ENUM (
  'em_andamento',
  'arquivado', 
  'suspenso',
  'conciliacao',
  'sentenca',
  'transito_julgado'
);

CREATE TYPE processo_prioridade AS ENUM (
  'baixa',
  'normal',
  'alta',
  'urgente'
);

CREATE TYPE movimentacao_tipo AS ENUM (
  'peticionamento',
  'audiencia',
  'despacho',
  'sentenca',
  'recurso',
  'juntada',
  'intimacao',
  'publicacao',
  'outros'
);

CREATE TYPE documento_tipo AS ENUM (
  'peticao',
  'contrato',
  'procuracao',
  'certidao',
  'sentenca',
  'acordao',
  'outros'
);

-- ==================== TABELAS AUXILIARES ====================
CREATE TABLE tribunais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  uf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comarcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tribunal_id UUID REFERENCES tribunais(id) ON DELETE CASCADE,
  uf TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nome, tribunal_id)
);

CREATE TABLE grupos_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tipos_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  grupo_acao_id UUID REFERENCES grupos_acoes(id) ON DELETE CASCADE,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nome, grupo_acao_id)
);

CREATE TABLE etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nome, user_id)
);

-- ==================== TABELA PRINCIPAL ====================
CREATE TABLE processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo TEXT NOT NULL UNIQUE,
  parte_ativa TEXT NOT NULL,
  parte_passiva TEXT NOT NULL,
  representantes JSONB,
  advogados_partes JSONB,
  cpf_cnpj_partes JSONB,
  tribunal_id UUID REFERENCES tribunais(id) ON DELETE SET NULL,
  comarca_id UUID REFERENCES comarcas(id) ON DELETE SET NULL,
  grupo_acao_id UUID REFERENCES grupos_acoes(id) ON DELETE SET NULL,
  tipo_acao_id UUID REFERENCES tipos_acao(id) ON DELETE SET NULL,
  valor_causa NUMERIC(15, 2),
  valor_custas NUMERIC(15, 2),
  advogado_responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status processo_status DEFAULT 'em_andamento',
  prioridade processo_prioridade DEFAULT 'normal',
  data_distribuicao DATE,
  prazo_proximo DATE,
  observacoes TEXT,
  is_draft BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_processos_numero ON processos(numero_processo);
CREATE INDEX idx_processos_parte_ativa ON processos USING gin(to_tsvector('portuguese', parte_ativa));
CREATE INDEX idx_processos_parte_passiva ON processos USING gin(to_tsvector('portuguese', parte_passiva));
CREATE INDEX idx_processos_status ON processos(status);
CREATE INDEX idx_processos_advogado ON processos(advogado_responsavel_id);
CREATE INDEX idx_processos_data_distribuicao ON processos(data_distribuicao);
CREATE INDEX idx_processos_prazo_proximo ON processos(prazo_proximo);
CREATE INDEX idx_processos_tribunal ON processos(tribunal_id);
CREATE INDEX idx_processos_comarca ON processos(comarca_id);
CREATE INDEX idx_processos_grupo_acao ON processos(grupo_acao_id);
CREATE INDEX idx_processos_tipo_acao ON processos(tipo_acao_id);
CREATE INDEX idx_processos_created_by ON processos(created_by);
CREATE INDEX idx_processos_is_draft ON processos(is_draft);

-- ==================== TABELAS DE RELACIONAMENTO ====================
CREATE TABLE processo_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(processo_id, etiqueta_id)
);

CREATE TABLE processo_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo movimentacao_tipo NOT NULL,
  data_movimentacao TIMESTAMPTZ NOT NULL,
  descricao TEXT NOT NULL,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  documento_id UUID,
  is_automated BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_processo ON processo_movimentacoes(processo_id);
CREATE INDEX idx_movimentacoes_data ON processo_movimentacoes(data_movimentacao DESC);

CREATE TABLE processo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo documento_tipo NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  versao INTEGER DEFAULT 1,
  documento_pai_id UUID REFERENCES processo_documentos(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  ocr_text TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documentos_processo ON processo_documentos(processo_id);
CREATE INDEX idx_documentos_tipo ON processo_documentos(tipo);
CREATE INDEX idx_documentos_ocr ON processo_documentos USING gin(to_tsvector('portuguese', COALESCE(ocr_text, '')));

ALTER TABLE processo_movimentacoes 
ADD CONSTRAINT fk_movimentacao_documento 
FOREIGN KEY (documento_id) REFERENCES processo_documentos(id) ON DELETE SET NULL;

CREATE TABLE processo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  campo_alterado TEXT,
  valor_anterior JSONB,
  valor_novo JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historico_processo ON processo_historico(processo_id);
CREATE INDEX idx_historico_data ON processo_historico(created_at DESC);

-- ==================== STORAGE BUCKET ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('processo-documentos', 'processo-documentos', FALSE);

-- ==================== RLS POLICIES ====================
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processos"
ON processos FOR SELECT
USING (
  auth.uid() = created_by 
  OR auth.uid() = advogado_responsavel_id
);

CREATE POLICY "Admins can view all processos"
ON processos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can create processos"
ON processos FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own processos"
ON processos FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() = advogado_responsavel_id
);

CREATE POLICY "Admins can update all processos"
ON processos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

ALTER TABLE tribunais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tribunais"
ON tribunais FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can create tribunais"
ON tribunais FOR INSERT
TO authenticated
WITH CHECK (TRUE);

ALTER TABLE comarcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view comarcas"
ON comarcas FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can create comarcas"
ON comarcas FOR INSERT
TO authenticated
WITH CHECK (TRUE);

ALTER TABLE grupos_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_acao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view grupos_acoes"
ON grupos_acoes FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can create grupos_acoes"
ON grupos_acoes FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "Everyone can view tipos_acao"
ON tipos_acao FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Authenticated users can create tipos_acao"
ON tipos_acao FOR INSERT
TO authenticated
WITH CHECK (TRUE);

ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own etiquetas"
ON etiquetas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own etiquetas"
ON etiquetas FOR INSERT
WITH CHECK (auth.uid() = user_id);

ALTER TABLE processo_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view etiquetas of their processos"
ON processo_etiquetas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_etiquetas.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

CREATE POLICY "Users can manage etiquetas of their processos"
ON processo_etiquetas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_etiquetas.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

ALTER TABLE processo_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movimentacoes of their processos"
ON processo_movimentacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_movimentacoes.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

CREATE POLICY "Users can create movimentacoes for their processos"
ON processo_movimentacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_movimentacoes.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

ALTER TABLE processo_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documentos of their processos"
ON processo_documentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_documentos.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
  OR is_public = TRUE
);

CREATE POLICY "Users can create documentos for their processos"
ON processo_documentos FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_documentos.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

ALTER TABLE processo_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view historico of their processos"
ON processo_historico FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_historico.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);

CREATE POLICY "System can create historico"
ON processo_historico FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Users can upload documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'processo-documentos');

CREATE POLICY "Users can view their processos documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'processo-documentos');

CREATE POLICY "Users can delete their documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'processo-documentos');

-- ==================== TRIGGERS E FUNCTIONS ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_processos_updated_at
BEFORE UPDATE ON processos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tribunais_updated_at
BEFORE UPDATE ON tribunais
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comarcas_updated_at
BEFORE UPDATE ON comarcas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grupos_acoes_updated_at
BEFORE UPDATE ON grupos_acoes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tipos_acao_updated_at
BEFORE UPDATE ON tipos_acao
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movimentacoes_updated_at
BEFORE UPDATE ON processo_movimentacoes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
BEFORE UPDATE ON processo_documentos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION processo_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO processo_historico (processo_id, acao, user_id)
    VALUES (NEW.id, 'Processo criado', NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO processo_historico (processo_id, acao, campo_alterado, valor_anterior, valor_novo, user_id)
    VALUES (
      NEW.id,
      'Processo atualizado',
      NULL,
      row_to_json(OLD),
      row_to_json(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER processo_audit
AFTER INSERT OR UPDATE ON processos
FOR EACH ROW
EXECUTE FUNCTION processo_audit_trigger();

-- ==================== MIGRAÇÃO DE DADOS ====================
INSERT INTO processos (
  numero_processo,
  parte_ativa,
  parte_passiva,
  observacoes,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT 
  numero_processo,
  cliente AS parte_ativa,
  'A definir' AS parte_passiva,
  CONCAT_WS(E'\n', 
    'Tribunal: ' || COALESCE(tribunal, ''),
    'Assunto: ' || COALESCE(assunto, ''),
    COALESCE('Observações: ' || observacoes, '')
  ) AS observacoes,
  CASE 
    WHEN status = 'ativo' THEN 'em_andamento'::processo_status
    WHEN status = 'arquivado' THEN 'arquivado'::processo_status
    WHEN status = 'vencido' THEN 'em_andamento'::processo_status
    WHEN status = 'aguardando' THEN 'suspenso'::processo_status
    ELSE 'em_andamento'::processo_status
  END AS status,
  user_id AS created_by,
  created_at,
  updated_at
FROM controladoria_processos
ON CONFLICT (numero_processo) DO NOTHING;

-- ==================== SEEDS ====================
INSERT INTO tribunais (nome, sigla, tipo, uf) VALUES
('Tribunal de Justiça de São Paulo', 'TJSP', 'estadual', 'SP'),
('Tribunal Regional Federal da 3ª Região', 'TRF3', 'federal', 'SP'),
('Tribunal Regional do Trabalho da 2ª Região', 'TRT2', 'trabalhista', 'SP'),
('Tribunal Superior do Trabalho', 'TST', 'trabalhista', 'DF'),
('Superior Tribunal de Justiça', 'STJ', 'federal', 'DF'),
('Supremo Tribunal Federal', 'STF', 'federal', 'DF')
ON CONFLICT (sigla) DO NOTHING;

INSERT INTO grupos_acoes (nome, descricao, cor) VALUES
('Civil', 'Ações de natureza civil', '#3b82f6'),
('Previdenciário', 'Ações previdenciárias', '#10b981'),
('Bancário', 'Ações bancárias e financeiras', '#f59e0b'),
('Rural', 'Ações relacionadas ao meio rural', '#84cc16'),
('Criminal', 'Ações penais', '#ef4444'),
('Trabalhista', 'Ações trabalhistas', '#8b5cf6'),
('Família', 'Ações de direito de família', '#ec4899'),
('Consumidor', 'Ações de direito do consumidor', '#06b6d4'),
('Tributário', 'Ações tributárias', '#eab308'),
('Empresarial', 'Ações empresariais', '#6366f1')
ON CONFLICT (nome) DO NOTHING;

DO $$
DECLARE
  grupo_civil_id UUID;
  grupo_previd_id UUID;
  grupo_trab_id UUID;
BEGIN
  SELECT id INTO grupo_civil_id FROM grupos_acoes WHERE nome = 'Civil';
  SELECT id INTO grupo_previd_id FROM grupos_acoes WHERE nome = 'Previdenciário';
  SELECT id INTO grupo_trab_id FROM grupos_acoes WHERE nome = 'Trabalhista';
  
  INSERT INTO tipos_acao (nome, grupo_acao_id, descricao) VALUES
  ('Ação Declaratória', grupo_civil_id, 'Ação para declarar a existência ou inexistência de relação jurídica'),
  ('Ação de Cobrança', grupo_civil_id, 'Ação para cobrança de valores'),
  ('Agravo de Instrumento', grupo_civil_id, 'Recurso contra decisão interlocutória'),
  ('Busca e Apreensão', grupo_civil_id, 'Ação para busca e apreensão de bens'),
  ('Aposentadoria por Tempo de Contribuição', grupo_previd_id, 'Concessão de aposentadoria'),
  ('Aposentadoria por Invalidez', grupo_previd_id, 'Concessão de aposentadoria por invalidez'),
  ('Auxílio-Doença', grupo_previd_id, 'Concessão de auxílio-doença'),
  ('Reclamação Trabalhista', grupo_trab_id, 'Ação trabalhista'),
  ('Rescisão Indireta', grupo_trab_id, 'Pedido de rescisão indireta')
  ON CONFLICT (nome, grupo_acao_id) DO NOTHING;
END $$;