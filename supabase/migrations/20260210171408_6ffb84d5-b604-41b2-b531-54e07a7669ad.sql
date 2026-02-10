
-- Tabela de viewers para carteiras TOTP
CREATE TABLE public.totp_wallet_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.totp_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_id, user_id)
);

-- Enable RLS
ALTER TABLE public.totp_wallet_viewers ENABLE ROW LEVEL SECURITY;

-- Admins/controllers podem gerenciar viewers do tenant
CREATE POLICY "Admins can manage wallet viewers"
ON public.totp_wallet_viewers
FOR ALL
USING (
  tenant_id IN (
    SELECT ur.tenant_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'controller')
  )
);

-- Usuários comuns podem ver seus próprios registros
CREATE POLICY "Users can view own viewer records"
ON public.totp_wallet_viewers
FOR SELECT
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_totp_wallet_viewers_wallet ON public.totp_wallet_viewers(wallet_id);
CREATE INDEX idx_totp_wallet_viewers_user ON public.totp_wallet_viewers(user_id);
CREATE INDEX idx_totp_wallet_viewers_tenant ON public.totp_wallet_viewers(tenant_id);
