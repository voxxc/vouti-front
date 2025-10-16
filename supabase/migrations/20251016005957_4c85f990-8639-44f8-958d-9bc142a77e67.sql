-- Adicionar coluna advogado_responsavel_id à tabela deadlines
ALTER TABLE deadlines 
ADD COLUMN advogado_responsavel_id UUID REFERENCES profiles(user_id);

-- Criar tabela de tags para deadlines
CREATE TABLE deadline_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(deadline_id, tagged_user_id)
);

-- Habilitar RLS na tabela deadline_tags
ALTER TABLE deadline_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver tags onde foram tagados
CREATE POLICY "Users can view tags where they are tagged"
  ON deadline_tags FOR SELECT
  USING (auth.uid() = tagged_user_id);

-- Policy: Usuários podem criar tags nos seus próprios deadlines
CREATE POLICY "Users can create tags on their deadlines"
  ON deadline_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deadlines 
      WHERE id = deadline_id 
      AND user_id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar tags dos seus deadlines
CREATE POLICY "Users can delete tags on their deadlines"
  ON deadline_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM deadlines 
      WHERE id = deadline_id 
      AND user_id = auth.uid()
    )
  );

-- Atualizar policy de SELECT em deadlines para incluir usuários tagados
DROP POLICY IF EXISTS "Users can view their own deadlines" ON deadlines;

CREATE POLICY "Users can view their deadlines and tagged deadlines"
  ON deadlines FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = advogado_responsavel_id
    OR EXISTS (
      SELECT 1 FROM deadline_tags 
      WHERE deadline_id = id 
      AND tagged_user_id = auth.uid()
    )
  );

-- Índices para melhor performance
CREATE INDEX idx_deadline_tags_deadline_id ON deadline_tags(deadline_id);
CREATE INDEX idx_deadline_tags_tagged_user_id ON deadline_tags(tagged_user_id);
CREATE INDEX idx_deadlines_advogado_responsavel ON deadlines(advogado_responsavel_id);