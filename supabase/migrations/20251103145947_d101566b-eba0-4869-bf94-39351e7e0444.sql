-- Remover coluna role obsoleta da tabela profiles
-- As roles agora são gerenciadas exclusivamente na tabela user_roles para segurança
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Adicionar comentário explicativo
COMMENT ON TABLE profiles IS 'User profile information. Roles are stored in user_roles table for security.';