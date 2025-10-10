-- Etapa 1: Infraestrutura de Tribunais

-- Criar extension para encriptação
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de credenciais dos tribunais
CREATE TABLE tribunal_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tribunal_code TEXT NOT NULL,
  tribunal_name TEXT NOT NULL,
  
  -- Credenciais (encriptadas)
  login TEXT,
  password_encrypted TEXT,
  oauth_token TEXT,
  oauth_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Certificado Digital
  certificate_path TEXT,
  certificate_password_encrypted TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  
  -- Metadata
  config_metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, tribunal_code)
);

-- Índices
CREATE INDEX idx_tribunal_credentials_user ON tribunal_credentials(user_id);
CREATE INDEX idx_tribunal_credentials_tribunal ON tribunal_credentials(tribunal_code);
CREATE INDEX idx_tribunal_credentials_active ON tribunal_credentials(is_active);

-- RLS
ALTER TABLE tribunal_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credentials"
ON tribunal_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own credentials"
ON tribunal_credentials FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger de updated_at
CREATE TRIGGER update_tribunal_credentials_updated_at
BEFORE UPDATE ON tribunal_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Functions para encriptar/desencriptar
CREATE OR REPLACE FUNCTION encrypt_credential(text_to_encrypt TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(text_to_encrypt, key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_text TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela de logs de sincronização
CREATE TABLE tribunal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  tribunal_code TEXT NOT NULL,
  
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  
  movimentacoes_imported INTEGER DEFAULT 0,
  documentos_found INTEGER DEFAULT 0,
  
  error_message TEXT,
  response_metadata JSONB,
  
  duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_user ON tribunal_sync_logs(user_id);
CREATE INDEX idx_sync_logs_processo ON tribunal_sync_logs(processo_id);
CREATE INDEX idx_sync_logs_status ON tribunal_sync_logs(status);
CREATE INDEX idx_sync_logs_created ON tribunal_sync_logs(created_at DESC);

ALTER TABLE tribunal_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
ON tribunal_sync_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync logs"
ON tribunal_sync_logs FOR INSERT
WITH CHECK (TRUE);

-- Storage bucket para certificados
INSERT INTO storage.buckets (id, name, public)
VALUES ('tribunal-certificates', 'tribunal-certificates', FALSE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para certificados
CREATE POLICY "Users can upload their certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tribunal-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tribunal-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tribunal-certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);