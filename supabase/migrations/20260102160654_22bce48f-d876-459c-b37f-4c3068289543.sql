-- Remover a política atual que permite bootstrap inseguro
DROP POLICY IF EXISTS "Allow first super admin or existing admins to insert" ON super_admins;

-- Criar nova política: APENAS super admins existentes podem inserir novos
CREATE POLICY "Only super admins can insert new admins"
ON super_admins
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));