-- Permitir que operadores do setor Programação criem novas OPs
CREATE POLICY "Programação can create new OPs"
ON metal_ops
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM metal_profiles
    WHERE user_id = auth.uid()
    AND setor = 'Programação'
  )
);