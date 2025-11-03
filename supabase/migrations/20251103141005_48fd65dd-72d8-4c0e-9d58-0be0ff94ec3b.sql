-- Adicionar coluna de status do cliente
ALTER TABLE clientes 
ADD COLUMN status_cliente TEXT NOT NULL DEFAULT 'ativo';

-- Adicionar constraint para validar apenas valores permitidos
ALTER TABLE clientes 
ADD CONSTRAINT clientes_status_check 
CHECK (status_cliente IN ('ativo', 'inativo', 'contrato_encerrado'));

-- Criar índice para melhorar performance em queries filtradas
CREATE INDEX idx_clientes_status ON clientes(status_cliente);