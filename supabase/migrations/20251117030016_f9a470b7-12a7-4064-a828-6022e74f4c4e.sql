-- Tabela para histórico de buscas por OAB
CREATE TABLE IF NOT EXISTS busca_processos_oab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oab_numero TEXT NOT NULL,
  oab_uf TEXT NOT NULL,
  user_id UUID NOT NULL,
  data_busca TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_processos_encontrados INTEGER NOT NULL DEFAULT 0,
  resultado_completo JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_busca_oab_numero ON busca_processos_oab(oab_numero);
CREATE INDEX IF NOT EXISTS idx_busca_oab_user ON busca_processos_oab(user_id);
CREATE INDEX IF NOT EXISTS idx_busca_oab_data ON busca_processos_oab(data_busca DESC);
CREATE INDEX IF NOT EXISTS idx_busca_oab_user_data ON busca_processos_oab(user_id, data_busca DESC);

-- Habilitar RLS
ALTER TABLE busca_processos_oab ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own searches"
  ON busca_processos_oab
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches"
  ON busca_processos_oab
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all searches"
  ON busca_processos_oab
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Controllers can view all searches"
  ON busca_processos_oab
  FOR SELECT
  USING (has_role(auth.uid(), 'controller'));