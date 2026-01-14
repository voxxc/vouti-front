-- Adicionar coluna para respostas de comentários
ALTER TABLE project_etapa_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES project_etapa_comments(id) ON DELETE CASCADE;

-- Index para buscar respostas de um comentário
CREATE INDEX IF NOT EXISTS idx_etapa_comments_parent ON project_etapa_comments(parent_comment_id);

-- Tabela para menções em comentários
CREATE TABLE IF NOT EXISTS project_etapa_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES project_etapa_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para buscar menções de um usuário
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON project_etapa_comment_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON project_etapa_comment_mentions(comment_id);

-- RLS para menções
ALTER TABLE project_etapa_comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in their tenant"
ON project_etapa_comment_mentions
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create mentions in their tenant"
ON project_etapa_comment_mentions
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own mentions"
ON project_etapa_comment_mentions
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);