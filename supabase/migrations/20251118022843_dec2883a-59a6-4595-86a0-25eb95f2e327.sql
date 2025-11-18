-- Add new columns to processos table for complete OAB import data
ALTER TABLE processos ADD COLUMN IF NOT EXISTS juizo TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS fase_processual TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS link_tribunal TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_condenacao NUMERIC;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS tipo_parte_oab TEXT;

-- Add comment for documentation
COMMENT ON COLUMN processos.tipo_parte_oab IS 'Indica o papel do OAB no processo: autor, reu, ou advogado';
COMMENT ON COLUMN processos.juizo IS 'Juízo onde tramita o processo';
COMMENT ON COLUMN processos.fase_processual IS 'Fase atual do processo (ex: conhecimento, execução)';
COMMENT ON COLUMN processos.link_tribunal IS 'Link direto para o processo no site do tribunal';
COMMENT ON COLUMN processos.valor_condenacao IS 'Valor da condenação (se houver)';