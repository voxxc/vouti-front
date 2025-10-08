-- Limpar dados órfãos antes de adicionar foreign keys

-- Deletar registros em metal_user_roles sem usuário correspondente
DELETE FROM metal_user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Deletar registros em metal_profiles sem usuário correspondente
DELETE FROM metal_profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Agora adicionar as foreign keys com CASCADE DELETE

-- Add foreign key to metal_profiles
ALTER TABLE metal_profiles 
ADD CONSTRAINT metal_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key to metal_user_roles
ALTER TABLE metal_user_roles 
ADD CONSTRAINT metal_user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;