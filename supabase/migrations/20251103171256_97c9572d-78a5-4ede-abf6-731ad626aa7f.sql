-- Adicionar coluna CPF para Pessoa Física
ALTER TABLE clientes
ADD COLUMN cpf VARCHAR(14);

-- Adicionar coluna CNPJ para Pessoa Jurídica
ALTER TABLE clientes
ADD COLUMN cnpj VARCHAR(18);

-- Adicionar comentários às colunas
COMMENT ON COLUMN clientes.cpf IS 'CPF do cliente pessoa física (formato: 000.000.000-00)';
COMMENT ON COLUMN clientes.cnpj IS 'CNPJ do cliente pessoa jurídica (formato: 00.000.000/0000-00)';

-- Criar índices para buscas (opcional, mas recomendado)
CREATE INDEX idx_clientes_cpf ON clientes(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_clientes_cnpj ON clientes(cnpj) WHERE cnpj IS NOT NULL;