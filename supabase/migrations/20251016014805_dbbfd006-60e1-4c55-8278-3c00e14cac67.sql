-- Permitir que donos de projetos e admins possam deletar projetos
CREATE POLICY "Project owners and admins can delete projects"
ON projects FOR DELETE
USING (
  is_project_owner(id) OR has_role(auth.uid(), 'admin')
);