-- Recreate RLS policies for metal_user_roles with explicit WITH CHECK

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON metal_user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON metal_user_roles;

-- Recreate policies with explicit WITH CHECK
CREATE POLICY "Admins can manage all roles"
ON metal_user_roles
FOR ALL
TO authenticated
USING (has_metal_role(auth.uid(), 'admin'))
WITH CHECK (has_metal_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view all roles"
ON metal_user_roles
FOR SELECT
TO authenticated
USING (true);