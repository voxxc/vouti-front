
-- Remover politica permissiva
DROP POLICY IF EXISTS "Users can view all profiles" ON metal_profiles;

-- Nova politica: apenas usuarios autenticados do Metal podem ver perfis
CREATE POLICY "Authenticated metal users can view profiles"
ON metal_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM metal_user_roles
    WHERE metal_user_roles.user_id = auth.uid()
  )
);
