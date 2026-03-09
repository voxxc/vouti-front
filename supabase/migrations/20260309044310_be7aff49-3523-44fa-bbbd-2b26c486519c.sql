-- Ajuste de segurança: remover política permissiva WITH CHECK (true)
-- Service role já possui bypass de RLS, então esta policy é desnecessária
DROP POLICY IF EXISTS "Service role pode inserir sinais" ON public.whatsapp_sync_signals;