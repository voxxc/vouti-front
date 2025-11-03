-- Adicionar coluna profissao na tabela clientes
ALTER TABLE clientes 
ADD COLUMN profissao TEXT;

-- Adicionar coluna UF (estado) na tabela clientes
ALTER TABLE clientes 
ADD COLUMN uf TEXT;

-- Criar índices para melhorar performance de queries analytics (apenas os que não existem)
CREATE INDEX idx_clientes_profissao ON clientes(profissao) WHERE profissao IS NOT NULL;
CREATE INDEX idx_clientes_uf ON clientes(uf) WHERE uf IS NOT NULL;
CREATE INDEX idx_clientes_data_nascimento ON clientes(data_nascimento) WHERE data_nascimento IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN clientes.profissao IS 'Profissão do contratante principal (apenas PF)';
COMMENT ON COLUMN clientes.uf IS 'Estado (UF) extraído do endereço do cliente';