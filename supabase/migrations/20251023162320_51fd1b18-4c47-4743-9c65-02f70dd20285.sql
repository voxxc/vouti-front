-- Criar tabela para credenciais do Projudi
CREATE TABLE IF NOT EXISTS public.projudi_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tribunal TEXT NOT NULL DEFAULT 'TJPR',
  login_encrypted TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  totp_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_validated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tribunal)
);

-- Enable RLS
ALTER TABLE public.projudi_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view their own credentials
CREATE POLICY "Users can view their own projudi credentials"
ON public.projudi_credentials
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert their own projudi credentials"
ON public.projudi_credentials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials
CREATE POLICY "Users can update their own projudi credentials"
ON public.projudi_credentials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own projudi credentials"
ON public.projudi_credentials
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all credentials
CREATE POLICY "Admins can view all projudi credentials"
ON public.projudi_credentials
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_projudi_credentials_user_tribunal ON public.projudi_credentials(user_id, tribunal);