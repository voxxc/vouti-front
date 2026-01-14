-- Função SECURITY DEFINER para contar processos do tenant (bypass RLS) apenas para admins
CREATE OR REPLACE FUNCTION public.get_dashboard_processos_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_is_admin boolean;
  v_count integer;
BEGIN
  SELECT tenant_id
    INTO v_tenant_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT public.is_current_user_admin_in_tenant(v_tenant_id)
    INTO v_is_admin;

  IF v_is_admin IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COUNT(*)
    INTO v_count
  FROM public.processos_oab
  WHERE tenant_id = v_tenant_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_processos_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_processos_count() TO authenticated;