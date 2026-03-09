-- Fix: RLS SELECT policy para whatsapp_sync_signals (necessário para Realtime funcionar)
CREATE POLICY "Authenticated users can read sync signals for their tenant"
ON public.whatsapp_sync_signals
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
);