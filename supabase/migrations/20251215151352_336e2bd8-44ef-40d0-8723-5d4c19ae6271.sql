-- Modificar a função handle_new_user_role para NÃO criar roles automaticamente
-- A Edge Function create-user já faz isso com tenant_id correto
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NAO criar role automaticamente para usuarios do sistema juridico
  -- A Edge Function create-user ja faz isso com tenant_id correto
  -- Apenas retorna sem fazer nada para evitar conflito de tenant_id
  RETURN NEW;
END;
$$;