-- Tipos de sistemas disponíveis
CREATE TABLE public.system_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes/Tenants (instâncias de cada sistema)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type_id UUID REFERENCES public.system_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email_domain TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Super Admins (usuários com acesso total ao painel de controle)
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.system_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- RLS Policies for system_types
CREATE POLICY "Super admins can manage system_types"
  ON public.system_types FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view active system_types"
  ON public.system_types FOR SELECT
  USING (is_active = true);

-- RLS Policies for tenants
CREATE POLICY "Super admins can manage tenants"
  ON public.tenants FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can view active tenants"
  ON public.tenants FOR SELECT
  USING (is_active = true);

-- RLS Policies for super_admins
CREATE POLICY "Super admins can view all super_admins"
  ON public.super_admins FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super_admins"
  ON public.super_admins FOR ALL
  USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial system types
INSERT INTO public.system_types (code, name, description, icon, color) VALUES
  ('juridico', 'Gestão Jurídica', 'Sistema completo para escritórios de advocacia', 'Scale', '#D4AF37'),
  ('metal', 'Gestão Metalúrgica', 'Controle de ordens de produção industrial', 'Factory', '#3B82F6'),
  ('linkinbio', 'Gestão Link-in-Bio', 'Plataforma de links personalizados', 'Link', '#8B5CF6');

-- Insert existing tenants
INSERT INTO public.tenants (system_type_id, name, slug, email_domain) VALUES
  ((SELECT id FROM public.system_types WHERE code = 'juridico'), 'SOLVENZA', 'solvenza', NULL),
  ((SELECT id FROM public.system_types WHERE code = 'metal'), 'Metal System', 'metal-system', '@metalsystem.local'),
  ((SELECT id FROM public.system_types WHERE code = 'linkinbio'), 'Vouti', 'vouti', '@vouti.bio');