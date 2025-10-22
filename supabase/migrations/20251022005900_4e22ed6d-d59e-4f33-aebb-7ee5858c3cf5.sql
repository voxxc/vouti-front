-- Fix handle_new_user function to remove invalid 'usuario' role
-- This was causing signup errors for all users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dental users
  IF NEW.email LIKE '%@dental.local' THEN
    INSERT INTO public.dental_profiles (user_id, email, full_name, avatar_url, especialidade)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'especialidade'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Metal users
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- Vouti.bio users (handled by handle_new_link_user trigger)
  IF NEW.email LIKE '%@vouti.bio' THEN
    RETURN NEW;
  END IF;

  -- Regular app users (law firm system)
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Do NOT insert into user_roles here to avoid conflicts
  -- Roles should be assigned manually by admins after signup
  
  RETURN NEW;
END;
$$;