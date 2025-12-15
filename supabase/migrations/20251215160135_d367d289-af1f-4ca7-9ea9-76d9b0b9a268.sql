-- Desabilitar RLS temporariamente para esta operação
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Inserir role admin para adv.rodrigocordeiro@gmail.com no tenant cordeiro
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  'b383cbee-7108-4711-8bca-faf8f45accf6',
  'admin',
  '272d9707-53b8-498d-bcc1-ea074b6c8c71'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Reabilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;