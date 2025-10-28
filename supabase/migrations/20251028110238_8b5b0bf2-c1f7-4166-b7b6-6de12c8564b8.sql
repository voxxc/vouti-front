-- Criar tabela de comentários para prazos
CREATE TABLE deadline_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_deadline_comentarios_deadline ON deadline_comentarios(deadline_id);
CREATE INDEX idx_deadline_comentarios_user ON deadline_comentarios(user_id);

-- Habilitar RLS
ALTER TABLE deadline_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver comentários de prazos"
  ON deadline_comentarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deadlines
      WHERE deadlines.id = deadline_comentarios.deadline_id
      AND (
        deadlines.user_id = auth.uid() 
        OR deadlines.advogado_responsavel_id = auth.uid()
        OR is_tagged_in_deadline(deadline_id, auth.uid())
      )
    )
  );

CREATE POLICY "Usuários podem criar comentários"
  ON deadline_comentarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar seus comentários"
  ON deadline_comentarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus comentários"
  ON deadline_comentarios FOR DELETE
  USING (auth.uid() = user_id);