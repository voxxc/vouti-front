-- 1. Corrigir a função is_current_user_admin_in_tenant para verificar tenant_id na role
CREATE OR REPLACE FUNCTION public.is_current_user_admin_in_tenant(_target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.tenant_id = _target_tenant_id
      AND p.tenant_id = _target_tenant_id
  )
$$;

-- 2. Restaurar role admin para danieldemorais.e@gmail.com no tenant Solvenza
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  'd4bcecc4-661a-430c-9b84-abdc3576a896',
  'admin',
  '27492091-e05d-46a8-9ee8-b3b47ec894e4'
)
ON CONFLICT (user_id, role) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;