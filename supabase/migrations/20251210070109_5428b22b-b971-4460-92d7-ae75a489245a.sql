-- Adicionar política que permite leitura pública de tenants ativos pelo slug
-- Necessário para o fluxo de login funcionar (TenantContext precisa validar o tenant antes da autenticação)
CREATE POLICY "Public can view active tenants by slug"
ON public.tenants
FOR SELECT
USING (is_active = true);