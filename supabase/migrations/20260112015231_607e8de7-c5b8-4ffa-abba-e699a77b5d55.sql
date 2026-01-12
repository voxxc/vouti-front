-- Tabela para perfil de assinatura do tenant (dados do administrador)
CREATE TABLE public.tenant_assinatura_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome_responsavel TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  termos_aceitos BOOLEAN DEFAULT false,
  termos_aceitos_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para boletos do tenant
CREATE TABLE public.tenant_boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  mes_referencia TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  url_boleto TEXT,
  codigo_barras TEXT,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_tenant_boletos_tenant_id ON public.tenant_boletos(tenant_id);
CREATE INDEX idx_tenant_boletos_status ON public.tenant_boletos(status);
CREATE INDEX idx_tenant_boletos_vencimento ON public.tenant_boletos(data_vencimento);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_assinatura_perfil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenant_assinatura_perfil_updated_at
BEFORE UPDATE ON public.tenant_assinatura_perfil
FOR EACH ROW EXECUTE FUNCTION public.update_tenant_assinatura_perfil_updated_at();

CREATE OR REPLACE FUNCTION public.update_tenant_boletos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenant_boletos_updated_at
BEFORE UPDATE ON public.tenant_boletos
FOR EACH ROW EXECUTE FUNCTION public.update_tenant_boletos_updated_at();

-- RLS para tenant_assinatura_perfil
ALTER TABLE public.tenant_assinatura_perfil ENABLE ROW LEVEL SECURITY;

-- SuperAdmin pode tudo
CREATE POLICY "SuperAdmin full access on tenant_assinatura_perfil"
ON public.tenant_assinatura_perfil
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Admin do tenant pode ver e editar seu próprio perfil
CREATE POLICY "Tenant admin can manage own profile"
ON public.tenant_assinatura_perfil
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.tenant_id = tenant_assinatura_perfil.tenant_id
      AND p.tenant_id = tenant_assinatura_perfil.tenant_id
  )
);

-- RLS para tenant_boletos
ALTER TABLE public.tenant_boletos ENABLE ROW LEVEL SECURITY;

-- SuperAdmin pode tudo
CREATE POLICY "SuperAdmin full access on tenant_boletos"
ON public.tenant_boletos
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Admin do tenant pode apenas visualizar seus boletos
CREATE POLICY "Tenant admin can view own boletos"
ON public.tenant_boletos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.tenant_id = tenant_boletos.tenant_id
      AND p.tenant_id = tenant_boletos.tenant_id
  )
);

-- Storage bucket para boletos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-boletos', 'tenant-boletos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "SuperAdmin can manage boletos files"
ON storage.objects
FOR ALL
USING (bucket_id = 'tenant-boletos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admin can view own boletos files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'tenant-boletos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.tenant_id::text = (storage.foldername(name))[1]
      AND p.tenant_id::text = (storage.foldername(name))[1]
  )
);