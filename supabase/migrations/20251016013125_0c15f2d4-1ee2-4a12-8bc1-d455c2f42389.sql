-- Corrigir política RLS para permitir que criadores vejam tags nos seus deadlines
DROP POLICY IF EXISTS "Users can view tags where they are tagged" ON deadline_tags;

CREATE POLICY "Users can view their deadline tags or where tagged"
ON deadline_tags FOR SELECT
USING (
  -- Pode ver se foi tagado
  auth.uid() = tagged_user_id
  OR
  -- Pode ver se criou o deadline
  EXISTS (
    SELECT 1 FROM deadlines
    WHERE deadlines.id = deadline_tags.deadline_id
    AND deadlines.user_id = auth.uid()
  )
);