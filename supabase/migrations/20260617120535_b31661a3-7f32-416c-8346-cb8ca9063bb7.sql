CREATE OR REPLACE FUNCTION public.can_use_apartados(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id = '8eda80fa-0319-4791-923e-551052282e62'::uuid
    OR public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'controller'::app_role)
    OR public.has_role(_user_id, 'financeiro'::app_role);
$$;