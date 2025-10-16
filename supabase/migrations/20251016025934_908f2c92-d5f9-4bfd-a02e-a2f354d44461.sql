-- Permitir que user_id seja NULL para leads de landing pages
ALTER TABLE leads_captacao 
ALTER COLUMN user_id DROP NOT NULL;

-- Remover a política antiga de INSERT que requer autenticação
DROP POLICY IF EXISTS "Users can create their own leads" ON leads_captacao;

-- Nova política: permitir que qualquer pessoa crie leads de landing pages
CREATE POLICY "Anyone can create leads from landing pages"
ON leads_captacao
FOR INSERT
WITH CHECK (
  user_id IS NULL 
  AND origem IN ('landing_page_1', 'landing_page_2')
);

-- Política: usuários autenticados podem criar seus próprios leads
CREATE POLICY "Authenticated users can create their own leads"
ON leads_captacao
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Remover a política antiga de SELECT
DROP POLICY IF EXISTS "Users can view their own leads" ON leads_captacao;

-- Nova política: usuários podem ver seus próprios leads E leads públicos
CREATE POLICY "Users can view their leads and public landing page leads"
ON leads_captacao
FOR SELECT
USING (
  auth.uid() = user_id 
  OR user_id IS NULL
);