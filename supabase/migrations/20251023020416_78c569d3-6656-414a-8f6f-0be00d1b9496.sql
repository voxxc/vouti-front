-- Fix 1: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Remove public access from leads_captacao table
DROP POLICY IF EXISTS "Users can view their leads and public landing page leads" ON public.leads_captacao;

CREATE POLICY "Users can view their own leads"
  ON public.leads_captacao FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leads"
  ON public.leads_captacao FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Require authentication for metal_ops table
DROP POLICY IF EXISTS "Operators can view all OPs" ON public.metal_ops;

CREATE POLICY "Authenticated metal users can view OPs"
  ON public.metal_ops FOR SELECT
  TO authenticated
  USING (
    has_metal_role(auth.uid(), 'admin'::metal_role) OR 
    has_metal_role(auth.uid(), 'operador'::metal_role)
  );

-- Fix 4: Add missing RLS policies for dental_profiles (with IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dental_profiles' 
    AND policyname = 'Users can view their own dental profile'
  ) THEN
    CREATE POLICY "Users can view their own dental profile"
      ON public.dental_profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dental_profiles' 
    AND policyname = 'Users can update their own dental profile'
  ) THEN
    CREATE POLICY "Users can update their own dental profile"
      ON public.dental_profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dental_profiles' 
    AND policyname = 'Users can insert their own dental profile'
  ) THEN
    CREATE POLICY "Users can insert their own dental profile"
      ON public.dental_profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dental_profiles' 
    AND policyname = 'Dental admins can view all profiles'
  ) THEN
    CREATE POLICY "Dental admins can view all profiles"
      ON public.dental_profiles FOR SELECT
      TO authenticated
      USING (has_dental_role(auth.uid(), 'admin'::dental_role));
  END IF;
END $$;