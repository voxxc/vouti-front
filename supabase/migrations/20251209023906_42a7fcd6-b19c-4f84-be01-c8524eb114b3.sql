-- Adicionar colunas para guardar request_id do lawsuit_cnj
ALTER TABLE processos_oab 
ADD COLUMN IF NOT EXISTS detalhes_request_id TEXT,
ADD COLUMN IF NOT EXISTS detalhes_request_data TIMESTAMPTZ;