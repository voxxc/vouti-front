-- Defesa em profundidade: bloquear qualquer acesso via client (anon/authenticated)
-- Service role das edge functions ignora RLS e continua funcionando normalmente
DROP POLICY IF EXISTS "block_client_access" ON public.password_reset_codes;

CREATE POLICY "block_client_access"
ON public.password_reset_codes
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);