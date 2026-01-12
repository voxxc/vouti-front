-- Tabela para armazenar credenciais enviadas pelos clientes
CREATE TABLE public.credenciais_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  oab_id UUID REFERENCES public.oabs_cadastradas(id) ON DELETE SET NULL,
  
  -- Dados preenchidos pelo cliente
  cpf TEXT NOT NULL,
  senha TEXT NOT NULL,
  documento_url TEXT,
  documento_nome TEXT,
  
  -- Controle de status
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  enviado_judit_em TIMESTAMPTZ,
  enviado_por UUID REFERENCES auth.users(id),
  erro_mensagem TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para registrar credenciais enviadas para a Judit
CREATE TABLE public.credenciais_judit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  oab_id UUID REFERENCES public.oabs_cadastradas(id) ON DELETE SET NULL,
  credencial_cliente_id UUID REFERENCES public.credenciais_cliente(id) ON DELETE SET NULL,
  
  -- Dados enviados para Judit
  customer_key TEXT NOT NULL,
  system_name TEXT NOT NULL DEFAULT '*',
  username TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error')),
  
  -- Metadados
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, customer_key, system_name)
);

-- Índices
CREATE INDEX idx_credenciais_cliente_tenant ON public.credenciais_cliente(tenant_id);
CREATE INDEX idx_credenciais_cliente_status ON public.credenciais_cliente(status);
CREATE INDEX idx_credenciais_judit_tenant ON public.credenciais_judit(tenant_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_credenciais_cliente_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_credenciais_cliente_updated_at
  BEFORE UPDATE ON public.credenciais_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credenciais_cliente_updated_at();

CREATE OR REPLACE FUNCTION public.update_credenciais_judit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_credenciais_judit_updated_at
  BEFORE UPDATE ON public.credenciais_judit
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credenciais_judit_updated_at();

-- RLS para credenciais_cliente
ALTER TABLE public.credenciais_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver próprias credenciais"
  ON public.credenciais_cliente FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Clientes podem criar credenciais"
  ON public.credenciais_cliente FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Clientes podem atualizar próprias credenciais"
  ON public.credenciais_cliente FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Clientes podem deletar próprias credenciais"
  ON public.credenciais_cliente FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    OR is_super_admin(auth.uid())
  );

-- RLS para credenciais_judit
ALTER TABLE public.credenciais_judit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver todas credenciais judit"
  ON public.credenciais_judit FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem criar credenciais judit"
  ON public.credenciais_judit FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem atualizar credenciais judit"
  ON public.credenciais_judit FOR UPDATE
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins podem deletar credenciais judit"
  ON public.credenciais_judit FOR DELETE
  USING (is_super_admin(auth.uid()));

-- Storage bucket para documentos de credenciais
INSERT INTO storage.buckets (id, name, public)
VALUES ('credenciais-documentos', 'credenciais-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para storage
CREATE POLICY "Clientes podem fazer upload de documentos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'credenciais-documentos'
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "Clientes e super admins podem ver documentos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'credenciais-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );

CREATE POLICY "Clientes podem deletar próprios documentos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'credenciais-documentos'
    AND (
      (storage.foldername(name))[1] = get_user_tenant_id()::text
      OR is_super_admin(auth.uid())
    )
  );