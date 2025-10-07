-- Add admin role to danieldemorais.e@gmail.com
INSERT INTO public.metal_user_roles (user_id, role)
SELECT user_id, 'admin'::metal_role
FROM public.metal_profiles
WHERE email = 'danieldemorais.e@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;