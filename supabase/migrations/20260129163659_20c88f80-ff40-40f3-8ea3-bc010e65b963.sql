-- 1. Tabela de configuração PIX da plataforma (global)
CREATE TABLE platform_pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_pix TEXT NOT NULL,
  tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('email', 'cpf', 'cnpj', 'celular', 'aleatoria')),
  nome_beneficiario TEXT NOT NULL,
  qr_code_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para platform_pix_config
ALTER TABLE platform_pix_config ENABLE ROW LEVEL SECURITY;

-- Super Admins podem gerenciar tudo
CREATE POLICY "super_admin_all" ON platform_pix_config
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Tenants podem apenas ler config ativa
CREATE POLICY "tenants_read_active" ON platform_pix_config
  FOR SELECT TO authenticated
  USING (ativo = true AND get_user_tenant_id() IS NOT NULL);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_platform_pix_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_platform_pix_config_updated_at
  BEFORE UPDATE ON platform_pix_config
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_pix_config_updated_at();

-- 2. Tabela de confirmações de pagamento
CREATE TABLE tenant_pagamento_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id UUID NOT NULL REFERENCES tenant_boletos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL CHECK (metodo IN ('pix', 'boleto')),
  data_confirmacao TIMESTAMPTZ DEFAULT now(),
  comprovante_path TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacao_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para tenant_pagamento_confirmacoes
ALTER TABLE tenant_pagamento_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Tenant pode ver suas próprias confirmações
CREATE POLICY "tenant_select" ON tenant_pagamento_confirmacoes
  FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Tenant pode criar suas próprias confirmações
CREATE POLICY "tenant_insert" ON tenant_pagamento_confirmacoes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Super Admin pode ver/gerenciar todas
CREATE POLICY "super_admin_select" ON tenant_pagamento_confirmacoes
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update" ON tenant_pagamento_confirmacoes
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete" ON tenant_pagamento_confirmacoes
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_tenant_pagamento_confirmacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenant_pagamento_confirmacoes_updated_at
  BEFORE UPDATE ON tenant_pagamento_confirmacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_pagamento_confirmacoes_updated_at();

-- 3. Storage bucket para QR Code (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-pix-qrcode', 'platform-pix-qrcode', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para QR Code
CREATE POLICY "super_admin_upload_qrcode" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'platform-pix-qrcode' AND is_super_admin(auth.uid()));

CREATE POLICY "super_admin_update_qrcode" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'platform-pix-qrcode' AND is_super_admin(auth.uid()));

CREATE POLICY "super_admin_delete_qrcode" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'platform-pix-qrcode' AND is_super_admin(auth.uid()));

CREATE POLICY "public_view_qrcode" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'platform-pix-qrcode');

-- 4. Storage bucket para comprovantes (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-comprovantes-pagamento', 'tenant-comprovantes-pagamento', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para comprovantes
CREATE POLICY "tenant_upload_comprovante" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-comprovantes-pagamento' 
    AND get_user_tenant_id() IS NOT NULL
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "tenant_view_own_comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-comprovantes-pagamento' 
    AND (storage.foldername(name))[1] = get_user_tenant_id()::text
  );

CREATE POLICY "super_admin_all_comprovantes" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tenant-comprovantes-pagamento' AND is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'tenant-comprovantes-pagamento' AND is_super_admin(auth.uid()));