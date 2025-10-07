-- Create profile for danieldemorais.e@gmail.com
INSERT INTO public.metal_profiles (user_id, email, full_name, setor)
VALUES (
  'd4bcecc4-661a-430c-9b84-abdc3576a896',
  'danieldemorais.e@gmail.com',
  'Daniel Pereira de Morais',
  NULL
)
ON CONFLICT (user_id) DO UPDATE
SET full_name = EXCLUDED.full_name;

-- Add admin role
INSERT INTO public.metal_user_roles (user_id, role)
VALUES (
  'd4bcecc4-661a-430c-9b84-abdc3576a896',
  'admin'::metal_role
)
ON CONFLICT (user_id, role) DO NOTHING;