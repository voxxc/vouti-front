-- Create metal_profiles table
CREATE TABLE public.metal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  setor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metal_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metal_profiles
CREATE POLICY "Users can view all profiles"
ON public.metal_profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.metal_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.metal_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create enum for Metal roles
CREATE TYPE public.metal_role AS ENUM ('admin', 'operador');

-- Create metal_user_roles table
CREATE TABLE public.metal_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role metal_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.metal_user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check metal roles
CREATE OR REPLACE FUNCTION public.has_metal_role(_user_id uuid, _role metal_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.metal_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for metal_user_roles
CREATE POLICY "Admins can manage all roles"
ON public.metal_user_roles
FOR ALL
USING (has_metal_role(auth.uid(), 'admin'::metal_role));

CREATE POLICY "Users can view all roles"
ON public.metal_user_roles
FOR SELECT
USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_metal_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_metal_profiles_updated_at
BEFORE UPDATE ON public.metal_profiles
FOR EACH ROW
EXECUTE FUNCTION update_metal_profiles_updated_at();