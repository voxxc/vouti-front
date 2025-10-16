-- Adicionar role controller ao usuário danieldemorais.e@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'controller'::app_role
FROM auth.users
WHERE email = 'danieldemorais.e@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;