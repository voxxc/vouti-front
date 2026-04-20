-- Tabela para armazenar tokens OAuth do Google Drive por usuário
CREATE TABLE public.user_google_drive_tokens (
  user_id uuid PRIMARY KEY,
  google_email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  root_folder_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_google_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drive tokens"
  ON public.user_google_drive_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drive tokens"
  ON public.user_google_drive_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drive tokens"
  ON public.user_google_drive_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drive tokens"
  ON public.user_google_drive_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_drive_tokens_updated_at
  BEFORE UPDATE ON public.user_google_drive_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();