-- Adicionar política de DELETE para reuniao_clientes
-- Permite que admins e usuários agenda deletem qualquer cliente
-- Usuários comuns só podem deletar seus próprios clientes

CREATE POLICY "Admins and agenda can delete any reuniao cliente"
ON reuniao_clientes
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'agenda'::app_role)
);

CREATE POLICY "Users can delete their own reuniao clientes"
ON reuniao_clientes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);