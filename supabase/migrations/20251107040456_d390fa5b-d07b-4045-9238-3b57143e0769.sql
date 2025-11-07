-- Permitir que usuários AGENDA gerenciem status de reuniões
CREATE POLICY "Agenda users can manage status"
ON reuniao_status
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agenda'::app_role)
);