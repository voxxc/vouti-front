
-- Update handle_new_link_user to use metadata instead of email parsing
CREATE OR REPLACE FUNCTION public.handle_new_link_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  username_value TEXT;
BEGIN
  -- Get username from metadata (new flow) or fallback to email parsing (legacy)
  username_value := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create link profile
  INSERT INTO public.link_profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    username_value,
    COALESCE(NEW.raw_user_meta_data->>'full_name', username_value)
  );
  
  -- Create default user role
  INSERT INTO public.link_user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Update handle_new_user to also check for app=linkbio metadata flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Metal users
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- Vouti.bio/Vlink users - legacy domain check
  IF NEW.email LIKE '%@vouti.bio' OR NEW.email LIKE '%@vlink.bio' THEN
    RETURN NEW;
  END IF;

  -- Link-in-Bio users with real email - check metadata flag
  IF NEW.raw_user_meta_data->>'app' = 'linkbio' THEN
    RETURN NEW;
  END IF;

  -- SOMENTE usuários do sistema jurídico chegam aqui
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
$function$;

-- We also need a trigger on auth.users for handle_new_link_user that fires for the metadata flag
-- Check: the existing trigger fires based on email domain. We need to update that condition.
-- Since we can't modify auth schema triggers directly via migration, we'll handle routing in handle_new_user instead.

-- Alternative approach: make handle_new_user call link user creation for app=linkbio
-- Let's update handle_new_user to handle linkbio users directly
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  username_value TEXT;
BEGIN
  -- Metal users
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- Vouti.bio/Vlink users - legacy domain check (handled by handle_new_link_user trigger)
  IF NEW.email LIKE '%@vouti.bio' OR NEW.email LIKE '%@vlink.bio' THEN
    RETURN NEW;
  END IF;

  -- Link-in-Bio users with real email - check metadata flag
  IF NEW.raw_user_meta_data->>'app' = 'linkbio' THEN
    -- Create link profile directly here
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

  -- SOMENTE usuários do sistema jurídico chegam aqui
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
$function$;
