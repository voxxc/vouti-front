-- Restaurar role admin para o usuário admin@teste.com do tenant Test
UPDATE user_roles 
SET role = 'admin', is_primary = true
WHERE user_id = '390c2594-5ba7-4884-8518-856057aacd44'
  AND tenant_id = 'e33d4546-5d2e-4eaa-ab85-382c5ca33012';

-- Se não existir a role, inserir
INSERT INTO user_roles (user_id, tenant_id, role, is_primary)
SELECT '390c2594-5ba7-4884-8518-856057aacd44', 'e33d4546-5d2e-4eaa-ab85-382c5ca33012', 'admin', true
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = '390c2594-5ba7-4884-8518-856057aacd44'
    AND tenant_id = 'e33d4546-5d2e-4eaa-ab85-382c5ca33012'
    AND role = 'admin'
);