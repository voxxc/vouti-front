-- Adicionar coluna de situação da agenda
ALTER TABLE reunioes 
ADD COLUMN IF NOT EXISTS situacao_agenda TEXT DEFAULT 'ativa' 
CHECK (situacao_agenda IN ('ativa', 'desmarcada', 'remarcada'));

-- Adicionar colunas de auditoria
ALTER TABLE reunioes 
ADD COLUMN IF NOT EXISTS data_alteracao_situacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_alteracao TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_reunioes_situacao 
ON reunioes(situacao_agenda);

-- Atualizar reuniões existentes para 'ativa'
UPDATE reunioes SET situacao_agenda = 'ativa' WHERE situacao_agenda IS NULL;

-- Comentários
COMMENT ON COLUMN reunioes.situacao_agenda IS 'Situação da reunião na agenda: ativa, desmarcada ou remarcada';
COMMENT ON COLUMN reunioes.data_alteracao_situacao IS 'Data/hora em que a situação foi alterada';
COMMENT ON COLUMN reunioes.motivo_alteracao IS 'Motivo da desmarcação ou remarcação';