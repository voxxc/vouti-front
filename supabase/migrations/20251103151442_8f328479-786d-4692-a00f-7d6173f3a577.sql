-- =============================================================================
-- MIGRATION: Implementar perfil Controller com acesso à Agenda e Controladoria
-- =============================================================================

-- 1. POLICIES PARA DEADLINES: Controllers podem ver todos os prazos
CREATE POLICY "Controllers can view all deadlines"
ON deadlines FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

COMMENT ON TABLE deadlines IS 'Agenda de prazos. Controllers e Admins podem ver todos, advogados veem apenas os seus.';

-- 2. POLICIES PARA PROCESSOS: Controllers têm acesso completo

-- Controllers podem ver todos os processos
CREATE POLICY "Controllers can view all processos"
ON processos FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem criar processos
CREATE POLICY "Controllers can create processos"
ON processos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem atualizar todos os processos
CREATE POLICY "Controllers can update all processos"
ON processos FOR UPDATE
USING (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem deletar processos (já existe migration 20251016041004, mas adicionamos comentário)
COMMENT ON TABLE processos IS 'Processos jurídicos. Controllers e Admins têm acesso total.';

-- 3. POLICIES PARA PROCESSO_MOVIMENTACOES: Controllers têm acesso completo

-- Controllers podem ver todas as movimentações
CREATE POLICY "Controllers can view all movimentacoes"
ON processo_movimentacoes FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem criar movimentações
CREATE POLICY "Controllers can create movimentacoes"
ON processo_movimentacoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem deletar movimentações
CREATE POLICY "Controllers can delete movimentacoes"
ON processo_movimentacoes FOR DELETE
USING (has_role(auth.uid(), 'controller'::app_role));

COMMENT ON TABLE processo_movimentacoes IS 'Movimentações processuais. Controllers podem gerenciar todas.';

-- 4. POLICIES PARA PROCESSO_DOCUMENTOS: Controllers podem ver e criar

-- Controllers podem ver todos os documentos
CREATE POLICY "Controllers can view all documentos"
ON processo_documentos FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem criar documentos
CREATE POLICY "Controllers can create documentos"
ON processo_documentos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'controller'::app_role));

-- 5. POLICIES PARA PROCESSO_ETIQUETAS: Controllers têm acesso completo

-- Controllers podem ver todas as etiquetas
CREATE POLICY "Controllers can view all etiquetas"
ON processo_etiquetas FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

-- Controllers podem gerenciar etiquetas
CREATE POLICY "Controllers can manage etiquetas"
ON processo_etiquetas FOR ALL
USING (has_role(auth.uid(), 'controller'::app_role));

-- 6. POLICIES PARA PROCESSO_HISTORICO: Controllers podem ver todo o histórico

-- Controllers podem ver todo o histórico
CREATE POLICY "Controllers can view all historico"
ON processo_historico FOR SELECT
USING (has_role(auth.uid(), 'controller'::app_role));

-- 7. ATUALIZAR FUNÇÃO get_users_with_roles: Adicionar controller com prioridade 4

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  highest_role TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT ur.role::text
        FROM user_roles ur
        WHERE ur.user_id = p.user_id
        ORDER BY 
          CASE ur.role::text
            WHEN 'admin' THEN 5
            WHEN 'controller' THEN 4
            WHEN 'financeiro' THEN 3
            WHEN 'comercial' THEN 2
            WHEN 'advogado' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      ),
      'advogado'
    ) as highest_role
  FROM profiles p
  WHERE p.email NOT LIKE '%@metalsystem.local%'
    AND p.email NOT LIKE '%@dental.local'
    AND p.email NOT LIKE '%@vouti.bio'
  ORDER BY p.created_at DESC;
$$;