-- Permitir que admins vejam todos os prazos
CREATE POLICY "Admins can view all deadlines"
ON deadlines FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
);