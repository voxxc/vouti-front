-- Permitir que operadores atualizem OPs em seu setor
CREATE POLICY "Operators can update ops in their sector"
ON public.metal_ops
FOR UPDATE
USING (
  -- Operador de Programação pode atualizar OPs sem setor ou em Programação
  (
    (setor_atual IS NULL OR setor_atual = 'Programação')
    AND EXISTS (
      SELECT 1 FROM metal_profiles 
      WHERE user_id = auth.uid() AND setor = 'Programação'
    )
  )
  OR
  -- Outros operadores podem atualizar OPs que estão no seu setor
  setor_atual = (
    SELECT setor FROM metal_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (true);