-- Limpar super_admin órfão (usuário deletado)
DELETE FROM super_admins WHERE user_id = '02824d5e-8c9d-4599-83ce-f3ef7f6be674';

-- Verificar e limpar outros registros órfãos (super_admins sem usuário correspondente)
DELETE FROM super_admins 
WHERE user_id NOT IN (SELECT id FROM auth.users);