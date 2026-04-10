
-- Create votech_role enum
CREATE TYPE public.votech_role AS ENUM ('admin', 'usuario', 'contador');

-- Create votech_profiles table
CREATE TABLE public.votech_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  empresa TEXT,
  cargo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create votech_user_roles table
CREATE TABLE public.votech_user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role votech_role NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.votech_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votech_user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for votech_profiles
CREATE POLICY "Users can view own votech profile"
  ON public.votech_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own votech profile"
  ON public.votech_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votech profile"
  ON public.votech_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for votech_user_roles
CREATE POLICY "Users can view own votech roles"
  ON public.votech_user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own votech role"
  ON public.votech_user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- has_votech_role function
CREATE OR REPLACE FUNCTION public.has_votech_role(_user_id uuid, _role votech_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.votech_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_votech_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_votech_profiles_updated_at
  BEFORE UPDATE ON public.votech_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_votech_profiles_updated_at();

-- Update handle_new_user to support @votech.local
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_value TEXT;
BEGIN
  -- Metal users
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- VoTech users
  IF NEW.email LIKE '%@votech.local' THEN
    INSERT INTO public.votech_profiles (user_id, email, full_name, empresa, cargo)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'empresa',
      NEW.raw_user_meta_data->>'cargo'
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.votech_user_roles (user_id, role)
    VALUES (NEW.id, 'usuario')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
  END IF;

  -- Vouti.bio/Vlink users
  IF NEW.email LIKE '%@vouti.bio' OR NEW.email LIKE '%@vlink.bio' THEN
    RETURN NEW;
  END IF;

  -- Link-in-Bio users with real email
  IF NEW.raw_user_meta_data->>'app' = 'linkbio' THEN
    username_value := COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    );
    
    INSERT INTO public.link_profiles (user_id, username, full_name)
    VALUES (
      NEW.id,
      username_value,
      COALESCE(NEW.raw_user_meta_data->>'full_name', username_value)
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.link_user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
  END IF;

  -- Sistema jurídico
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
