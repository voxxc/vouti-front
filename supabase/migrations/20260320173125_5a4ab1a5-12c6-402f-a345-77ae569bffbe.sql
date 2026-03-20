CREATE OR REPLACE FUNCTION public.get_server_time_ms()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
$$;