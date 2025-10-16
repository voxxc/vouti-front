-- Permitir que controllers e admins atualizem todas as movimentações
CREATE POLICY "Controllers and admins can update all movimentacoes"
ON public.processo_movimentacoes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'controller'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Permitir que usuários atualizem movimentações dos seus processos
CREATE POLICY "Users can update movimentacoes of their processos"
ON public.processo_movimentacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM processos p
    WHERE p.id = processo_movimentacoes.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM processos p
    WHERE p.id = processo_movimentacoes.processo_id
      AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);