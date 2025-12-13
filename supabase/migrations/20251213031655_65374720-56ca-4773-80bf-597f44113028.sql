-- Adicionar campos de identificação do escritório na tabela tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS responsavel_financeiro TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;