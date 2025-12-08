-- Adicionar colunas para salvar request_id e evitar custos desnecessários
ALTER TABLE oabs_cadastradas 
ADD COLUMN IF NOT EXISTS ultimo_request_id TEXT,
ADD COLUMN IF NOT EXISTS request_id_data TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN oabs_cadastradas.ultimo_request_id IS 'ID do último request feito à Judit API (para reutilização gratuita via GET /responses/)';
COMMENT ON COLUMN oabs_cadastradas.request_id_data IS 'Data/hora em que o request_id foi gerado';