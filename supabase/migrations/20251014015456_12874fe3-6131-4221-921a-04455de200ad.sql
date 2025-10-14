-- RESTAURAR DANIEL COMO ADMIN NO MORA
-- Recriar profile do Daniel
INSERT INTO profiles (user_id, email, full_name, role)
VALUES (
  'd4bcecc4-661a-430c-9b84-abdc3576a896',
  'danieldemorais.e@gmail.com',
  'Daniel Pereira de Morais',
  'admin'
)
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', 
    email = 'danieldemorais.e@gmail.com',
    full_name = 'Daniel Pereira de Morais';

-- Adicionar role de admin em user_roles
INSERT INTO user_roles (user_id, role)
VALUES ('d4bcecc4-661a-430c-9b84-abdc3576a896', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- CORRIGIR RLS POLICY
-- Substituir a policy existente por uma mais específica
DROP POLICY IF EXISTS "Prevent MetalSystem users in Mora queries" ON profiles;

CREATE POLICY "Hide MetalSystem-only users from Mora"
ON profiles
FOR SELECT
USING (
  -- Ocultar apenas usuários do domínio @metalsystem.local
  -- Mas permitir usuários como Daniel que usam ambos sistemas
  email NOT LIKE '%@metalsystem.local'
);