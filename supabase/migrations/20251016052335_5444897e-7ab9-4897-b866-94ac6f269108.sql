-- Adicionar policy para permitir exclusão de movimentações
CREATE POLICY "Users can delete movimentacoes of their processos"
ON processo_movimentacoes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM processos p
    WHERE p.id = processo_movimentacoes.processo_id
    AND (p.created_by = auth.uid() OR p.advogado_responsavel_id = auth.uid())
  )
);