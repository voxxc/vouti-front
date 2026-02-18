
INSERT INTO public.system_types (code, name, description, icon, color, is_active)
VALUES ('crm', 'Vouti.CRM', 'Plataforma de gestão de clientes e WhatsApp', 'MessageSquare', '#E11D48', true)
ON CONFLICT DO NOTHING;
