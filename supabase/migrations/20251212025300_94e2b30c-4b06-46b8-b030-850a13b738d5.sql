-- Restaurar role admin para danieldemorais.e@gmail.com no tenant Solvenza
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  'd4bcecc4-661a-430c-9b84-abdc3576a896',
  'admin',
  '27492091-e05d-46a8-9ee8-b3b47ec894e4'
)
ON CONFLICT (user_id, role) DO NOTHING;