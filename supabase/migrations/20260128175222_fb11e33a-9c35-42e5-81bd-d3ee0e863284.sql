-- Adicionar colunas de resposta/citação na tabela task_comments
ALTER TABLE task_comments 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES task_comments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_to_text TEXT,
ADD COLUMN IF NOT EXISTS reply_to_author TEXT;

-- Índice para otimizar consultas de respostas
CREATE INDEX IF NOT EXISTS idx_task_comments_reply_to_id ON task_comments(reply_to_id);