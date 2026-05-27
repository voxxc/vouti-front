ALTER TABLE public.credenciais_judit
  ADD COLUMN IF NOT EXISTS apelido text;

DROP FUNCTION IF EXISTS public.list_judit_credentials(uuid);

CREATE FUNCTION public.list_judit_credentials(p_tenant_id uuid)
RETURNS TABLE(id uuid, system_name text, customer_key text, apelido text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT (
    is_super_admin(auth.uid())
    OR has_role_in_tenant(auth.uid(), p_tenant_id, ARRAY['admin','controller','financeiro','comercial','agenda','advogado','estagiario'])
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = 'danieldemorais.e@gmail.com'
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT c.id, c.system_name, c.customer_key, c.apelido
    FROM public.credenciais_judit c
    WHERE c.tenant_id = p_tenant_id AND c.status = 'active'
    ORDER BY COALESCE(c.apelido, c.system_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_judit_credentials(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_judit_credential_apelido(
  p_id uuid,
  p_apelido text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.credenciais_judit WHERE id = p_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Credencial não encontrada';
  END IF;

  IF NOT (
    is_super_admin(auth.uid())
    OR has_role_in_tenant(auth.uid(), v_tenant, ARRAY['admin','controller'])
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = 'danieldemorais.e@gmail.com'
    )
  ) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  UPDATE public.credenciais_judit
     SET apelido = NULLIF(trim(p_apelido), ''),
         updated_at = now()
   WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_judit_credential_apelido(uuid, text) TO authenticated;