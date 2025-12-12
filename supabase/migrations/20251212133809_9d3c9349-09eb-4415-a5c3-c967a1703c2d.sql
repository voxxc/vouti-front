-- Adicionar colunas para AI Summary na tabela processos_oab
ALTER TABLE processos_oab ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE processos_oab ADD COLUMN IF NOT EXISTS ai_summary_data JSONB;

-- Remover tabela de chat messages (nao sera usada)
DROP TABLE IF EXISTS ai_chat_messages;

-- Manter tenant_ai_settings para o toggle de ativacao