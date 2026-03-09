-- Tabela de sinais de sincronização para WhatsApp
-- Webhook escreve aqui após inserir mensagem, frontend reage
CREATE TABLE IF NOT EXISTS public.whatsapp_sync_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL DEFAULT 'message_received',
  phone TEXT NOT NULL,
  agent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para performance nas queries de limpeza
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_signals_created_at 
  ON public.whatsapp_sync_signals(created_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_signals_tenant 
  ON public.whatsapp_sync_signals(tenant_id);

-- RLS: Permitir leitura autenticada e escrita via service role
ALTER TABLE public.whatsapp_sync_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler sinais do seu tenant"
  ON public.whatsapp_sync_signals
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    OR tenant_id IS NULL
  );

CREATE POLICY "Service role pode inserir sinais"
  ON public.whatsapp_sync_signals
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Função para limpar sinais antigos (> 1 minuto) automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_sync_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM whatsapp_sync_signals
  WHERE created_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- Trigger para limpar sinais antigos após cada INSERT (auto-cleanup)
CREATE OR REPLACE FUNCTION trigger_cleanup_sync_signals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar sinais com mais de 1 minuto (apenas 1 em cada 10 inserts para performance)
  IF random() < 0.1 THEN
    PERFORM cleanup_old_sync_signals();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_sync_signals_trigger
  AFTER INSERT ON whatsapp_sync_signals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_sync_signals();