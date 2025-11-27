-- =============================================
-- BATINK SYSTEM - Database Setup
-- =============================================

-- 1. Add new system type for BATINK
INSERT INTO system_types (name, code, description, icon, color)
VALUES (
  'Gestão de Ponto Digital',
  'ponto',
  'Sistema de controle de ponto e jornada de trabalho',
  'Clock',
  '#9333EA'
) ON CONFLICT (code) DO NOTHING;

-- 2. Create batink_profiles table
CREATE TABLE IF NOT EXISTS public.batink_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa TEXT,
  full_name TEXT,
  cargo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Create batink_user_roles table
CREATE TYPE batink_role AS ENUM ('admin', 'gestor', 'funcionario');

CREATE TABLE IF NOT EXISTS public.batink_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role batink_role NOT NULL DEFAULT 'funcionario',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Enable RLS on both tables
ALTER TABLE public.batink_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batink_user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create helper function for batink roles
CREATE OR REPLACE FUNCTION public.has_batink_role(_user_id UUID, _role batink_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.batink_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. RLS Policies for batink_profiles
CREATE POLICY "Users can view all batink profiles"
ON public.batink_profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own batink profile"
ON public.batink_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batink profile"
ON public.batink_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all batink profiles"
ON public.batink_profiles
FOR ALL
USING (has_batink_role(auth.uid(), 'admin'));

-- 7. RLS Policies for batink_user_roles
CREATE POLICY "Users can view all batink roles"
ON public.batink_user_roles
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all batink roles"
ON public.batink_user_roles
FOR ALL
USING (has_batink_role(auth.uid(), 'admin'))
WITH CHECK (has_batink_role(auth.uid(), 'admin'));

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_batink_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_batink_profiles_updated_at
BEFORE UPDATE ON public.batink_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_batink_profiles_updated_at();