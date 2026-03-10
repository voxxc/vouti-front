-- Add danieldemorais@vouti.co as SPN admin
INSERT INTO public.spn_profiles (user_id, full_name)
VALUES ('8eda80fa-0319-4791-923e-551052282e62', 'Daniel de Morais')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.spn_user_roles (user_id, role)
VALUES ('8eda80fa-0319-4791-923e-551052282e62', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;