-- =============================================
-- VOUTI.BIO SYSTEM - ISOLATED DATABASE SCHEMA
-- =============================================

-- 1. CREATE ENUM FOR LINK SYSTEM ROLES
CREATE TYPE link_role AS ENUM ('admin', 'user');

-- 2. CREATE LINK PROFILES TABLE
CREATE TABLE link_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  theme_color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT link_profiles_user_id_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX idx_link_profiles_user_id ON link_profiles(user_id);
CREATE INDEX idx_link_profiles_username ON link_profiles(username);

-- Enable RLS
ALTER TABLE link_profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE LINK ITEMS TABLE
CREATE TABLE link_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES link_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_link_items_profile_id ON link_items(profile_id);
CREATE INDEX idx_link_items_position ON link_items(profile_id, position);

-- Enable RLS
ALTER TABLE link_items ENABLE ROW LEVEL SECURITY;

-- 4. CREATE LINK USER ROLES TABLE
CREATE TABLE link_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role link_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT link_user_roles_unique UNIQUE (user_id, role)
);

-- Index
CREATE INDEX idx_link_user_roles_user_id ON link_user_roles(user_id);

-- Enable RLS
ALTER TABLE link_user_roles ENABLE ROW LEVEL SECURITY;

-- 5. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKING
CREATE OR REPLACE FUNCTION has_link_role(_user_id UUID, _role link_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.link_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. CREATE TRIGGER FUNCTION FOR NEW VOUTI.BIO USERS
CREATE OR REPLACE FUNCTION handle_new_link_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only process users with @vouti.bio email domain
  IF NEW.email NOT LIKE '%@vouti.bio' THEN
    RETURN NEW;
  END IF;

  -- Generate base username from email or full name
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    base_username := LOWER(REGEXP_REPLACE(
      NEW.raw_user_meta_data->>'full_name', 
      '[^a-zA-Z0-9]', 
      '', 
      'g'
    ));
  ELSE
    base_username := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  -- Ensure username is unique by adding counter if needed
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM link_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  -- Create link profile
  INSERT INTO public.link_profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );

  -- Assign default 'user' role
  INSERT INTO public.link_user_roles (user_id, role)
  VALUES (NEW.id, 'user'::link_role);

  -- First user becomes admin
  IF (SELECT COUNT(*) FROM link_user_roles WHERE role = 'admin'::link_role) = 1 THEN
    INSERT INTO public.link_user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::link_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. CREATE TRIGGER ON AUTH.USERS
CREATE TRIGGER on_auth_link_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_link_user();

-- 8. CREATE RLS POLICIES FOR LINK_PROFILES
CREATE POLICY "Users can view their own link profile"
  ON link_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own link profile"
  ON link_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view profiles by username"
  ON link_profiles FOR SELECT
  USING (true);

-- 9. CREATE RLS POLICIES FOR LINK_ITEMS
CREATE POLICY "Users can manage their own links"
  ON link_items FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM link_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active links"
  ON link_items FOR SELECT
  USING (is_active = true);

-- 10. CREATE RLS POLICIES FOR LINK_USER_ROLES
CREATE POLICY "Users can view their own roles"
  ON link_user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON link_user_roles FOR ALL
  USING (has_link_role(auth.uid(), 'admin'::link_role));

-- 11. CREATE UPDATE TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_link_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_link_profiles_updated_at_trigger
  BEFORE UPDATE ON link_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_link_profiles_updated_at();