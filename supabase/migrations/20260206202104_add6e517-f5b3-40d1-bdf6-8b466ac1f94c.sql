-- Adicionar colunas para armazenar request_id do tracking
ALTER TABLE processos_oab 
  ADD COLUMN IF NOT EXISTS tracking_request_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_request_data TIMESTAMPTZ;

-- Comentário para documentação
COMMENT ON COLUMN processos_oab.tracking_request_id IS 
  'Request ID mais recente obtido via GET /tracking. Diferente de detalhes_request_id que vem de POST.';

COMMENT ON COLUMN processos_oab.tracking_request_data IS 
  'Data/hora em que o tracking_request_id foi obtido';