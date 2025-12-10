-- CRITICAL: Fix multi-tenant data isolation for profiles and user_roles
-- Remove overly permissive RLS policies that leak data between tenants

-- 1. Drop permissive policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- 2. Drop permissive policies on user_roles table  
DROP POLICY IF EXISTS "Authenticated users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

-- 3. Create proper tenant-isolated policy for profiles
CREATE POLICY "Users can view profiles in same tenant"
ON profiles FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- 4. Create proper tenant-isolated policy for user_roles
CREATE POLICY "Users can view roles in same tenant"
ON user_roles FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());