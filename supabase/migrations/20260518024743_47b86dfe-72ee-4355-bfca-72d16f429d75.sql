-- 1. Coluna is_support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_support boolean NOT NULL DEFAULT false;

-- 2. Marca suporte@vouti.co como conta de suporte
UPDATE public.profiles
SET is_support = true
WHERE user_id = '59cfde93-d139-4377-9036-17f9f9fcf274';

-- 3. RPC para "assumir" um tenant ao logar via /{slug}/auth
CREATE OR REPLACE FUNCTION public.support_assume_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_support boolean;
BEGIN
  -- Valida que o caller é uma conta de suporte
  SELECT is_support INTO v_is_support
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_support, false) THEN
    RAISE EXCEPTION 'not a support account';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  -- Valida tenant existente
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'tenant not found';
  END IF;

  -- Atualiza profile.tenant_id para o tenant alvo (RLS usa get_user_tenant_id)
  UPDATE profiles
  SET tenant_id = p_tenant_id, updated_at = now()
  WHERE user_id = auth.uid();

  -- Garante role admin no tenant
  INSERT INTO user_roles (user_id, role, tenant_id)
  VALUES (auth.uid(), 'admin'::app_role, p_tenant_id)
  ON CONFLICT (user_id, role, tenant_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.support_assume_tenant(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.support_assume_tenant(uuid) TO authenticated;