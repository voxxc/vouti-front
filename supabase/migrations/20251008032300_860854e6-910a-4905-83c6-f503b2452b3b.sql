-- Primeiro, remover a política antiga que é específica para Programação
DROP POLICY IF EXISTS "Operators can update ops in their sector" ON public.metal_ops;

-- Criar nova política que permite qualquer operador atualizar OPs em seu setor
CREATE POLICY "Operators can update ops in their sector"
ON public.metal_ops
FOR UPDATE
USING (
  -- Operadores podem atualizar OPs que estão no seu setor
  setor_atual = (
    SELECT setor FROM metal_profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Programação pode atualizar OPs sem setor (novas OPs)
  (
    setor_atual IS NULL
    AND EXISTS (
      SELECT 1 FROM metal_profiles 
      WHERE user_id = auth.uid() AND setor = 'Programação'
    )
  )
)
WITH CHECK (true);