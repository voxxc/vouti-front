-- Remove a política que permite leitura pública de perfis
-- Esta política não verificava autenticação, expondo emails e dados de usuários
DROP POLICY IF EXISTS "Hide MetalSystem-only users from Mora" ON public.profiles;