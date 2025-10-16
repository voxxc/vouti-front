-- Remover as políticas problemáticas
DROP POLICY IF EXISTS "Users can view their deadline tags or where tagged" ON deadline_tags;
DROP POLICY IF EXISTS "Users can view their deadlines and tagged deadlines" ON deadlines;

-- Criar função security definer para verificar se usuário é dono do deadline
CREATE OR REPLACE FUNCTION public.is_deadline_owner(_deadline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deadlines
    WHERE id = _deadline_id
      AND (user_id = _user_id OR advogado_responsavel_id = _user_id)
  )
$$;

-- Criar função security definer para verificar se usuário está tagado no deadline
CREATE OR REPLACE FUNCTION public.is_tagged_in_deadline(_deadline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deadline_tags
    WHERE deadline_id = _deadline_id
      AND tagged_user_id = _user_id
  )
$$;

-- Recriar política de visualização de deadlines usando as funções
CREATE POLICY "Users can view their deadlines and tagged deadlines"
ON deadlines FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = advogado_responsavel_id 
  OR is_tagged_in_deadline(id, auth.uid())
);

-- Recriar política de visualização de deadline_tags usando a função
CREATE POLICY "Users can view their deadline tags or where tagged"
ON deadline_tags FOR SELECT
USING (
  auth.uid() = tagged_user_id
  OR is_deadline_owner(deadline_id, auth.uid())
);