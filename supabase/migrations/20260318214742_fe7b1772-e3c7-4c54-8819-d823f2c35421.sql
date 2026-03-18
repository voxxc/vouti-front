CREATE OR REPLACE FUNCTION public.handle_new_link_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  username_value TEXT;
BEGIN
  -- Only handle link-bio users (legacy domain or metadata flag)
  IF NEW.email NOT LIKE '%@vouti.bio' 
     AND NEW.email NOT LIKE '%@vlink.bio'
     AND COALESCE(NEW.raw_user_meta_data->>'app', '') != 'linkbio' THEN
    RETURN NEW;
  END IF;

  -- If handled by handle_new_user (linkbio with real email), skip here
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') = 'linkbio' 
     AND NEW.email NOT LIKE '%@vouti.bio' 
     AND NEW.email NOT LIKE '%@vlink.bio' THEN
    RETURN NEW;
  END IF;

  -- Get username from metadata or fallback to email parsing
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
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default user role
  INSERT INTO public.link_user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;