
-- Fix the trigger that creates link_profiles and link_user_roles on signup
-- Use CASCADE to drop dependent objects

DROP TRIGGER IF EXISTS on_auth_user_created_link ON auth.users;
DROP TRIGGER IF EXISTS on_auth_link_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_link_user() CASCADE;

-- Create function to handle new user signup for vouti.bio
CREATE OR REPLACE FUNCTION public.handle_new_link_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_value TEXT;
BEGIN
  -- Extract username from email (format: username@vouti.bio)
  username_value := split_part(NEW.email, '@', 1);
  
  -- Create link profile
  INSERT INTO public.link_profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    username_value,
    COALESCE(NEW.raw_user_meta_data->>'full_name', username_value)
  );
  
  -- Create default user role ('user' not 'usuario')
  INSERT INTO public.link_user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created_link
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_link_user();
