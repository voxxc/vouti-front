-- Tabela para armazenar códigos de recuperação de senha
CREATE TABLE public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_slug TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por código e email
CREATE INDEX idx_prc_code_email ON public.password_reset_codes(code, email);

-- Índice para limpeza de códigos expirados
CREATE INDEX idx_prc_expires_at ON public.password_reset_codes(expires_at);

-- RLS: Nenhuma política pública - apenas service_role pode acessar
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Comentário na tabela
COMMENT ON TABLE public.password_reset_codes IS 'Códigos de recuperação de senha com expiração de 15 minutos';