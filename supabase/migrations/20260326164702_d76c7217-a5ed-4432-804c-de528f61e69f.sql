-- Remove orphaned profiles and user_roles for the incorrect amsadvocacia tenant
DELETE FROM public.user_roles WHERE tenant_id = '4f1f0568-dfe6-40f1-a73c-c77b62459383';
DELETE FROM public.profiles WHERE tenant_id = '4f1f0568-dfe6-40f1-a73c-c77b62459383';
DELETE FROM public.tenants WHERE id = '4f1f0568-dfe6-40f1-a73c-c77b62459383';