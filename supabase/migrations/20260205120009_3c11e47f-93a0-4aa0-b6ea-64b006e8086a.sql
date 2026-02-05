-- Adicionar coluna cnh_validade na tabela clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS cnh_validade date;

COMMENT ON COLUMN clientes.cnh_validade IS 'Data de validade da CNH do cliente';

-- Tornar campos antes obrigatórios em opcionais
ALTER TABLE clientes 
ALTER COLUMN data_fechamento DROP NOT NULL,
ALTER COLUMN valor_contrato DROP NOT NULL,
ALTER COLUMN forma_pagamento DROP NOT NULL;