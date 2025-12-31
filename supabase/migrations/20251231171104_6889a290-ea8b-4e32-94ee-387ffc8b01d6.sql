-- Controller pode VER todos os projetos do tenant
CREATE POLICY "Controller can view tenant projects" 
ON public.projects
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Controller pode VER todas as tasks do tenant (para ver progresso/detalhes)
CREATE POLICY "Controller can view tenant tasks" 
ON public.tasks
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = tasks.project_id 
    AND p.tenant_id = get_user_tenant_id()
  )
);

-- Controller pode VER colunas do kanban
CREATE POLICY "Controller can view tenant project columns" 
ON public.project_columns
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_columns.project_id 
    AND p.tenant_id = get_user_tenant_id()
  )
);