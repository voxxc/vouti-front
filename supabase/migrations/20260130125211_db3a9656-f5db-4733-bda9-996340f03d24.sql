-- Função helper para verificar se usuário é admin ou controller do tenant
CREATE OR REPLACE FUNCTION public.is_admin_or_controller_in_tenant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role IN ('admin', 'controller')
  )
$$;

-- Tabela de carteiras TOTP
CREATE TABLE public.totp_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  oab_numero text,
  oab_uf text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Tabela de tokens TOTP
CREATE TABLE public.totp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.totp_wallets(id) ON DELETE CASCADE,
  name text NOT NULL,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_totp_wallets_tenant ON totp_wallets(tenant_id);
CREATE INDEX idx_totp_tokens_tenant ON totp_tokens(tenant_id);
CREATE INDEX idx_totp_tokens_wallet ON totp_tokens(wallet_id);

-- Habilitar RLS
ALTER TABLE totp_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para totp_wallets
CREATE POLICY "totp_wallets_select" ON totp_wallets
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_wallets_insert" ON totp_wallets
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_wallets_update" ON totp_wallets
  FOR UPDATE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_wallets_delete" ON totp_wallets
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

-- Políticas para totp_tokens
CREATE POLICY "totp_tokens_select" ON totp_tokens
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_tokens_insert" ON totp_tokens
  FOR INSERT WITH CHECK (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_tokens_update" ON totp_tokens
  FOR UPDATE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );

CREATE POLICY "totp_tokens_delete" ON totp_tokens
  FOR DELETE USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id() 
    AND is_admin_or_controller_in_tenant()
  );