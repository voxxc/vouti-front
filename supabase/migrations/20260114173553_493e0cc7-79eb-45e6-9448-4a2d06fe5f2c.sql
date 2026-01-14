-- Adicionar campos de perfil completo à tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_pessoal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contato_emergencia_nome TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contato_emergencia_telefone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contato_emergencia_relacao TEXT;