-- Controller pode CRIAR prazos para qualquer advogado do tenant
CREATE POLICY "Controllers can create tenant deadlines" 
ON public.deadlines
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'controller'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Controller pode ATUALIZAR prazos do tenant
CREATE POLICY "Controllers can update tenant deadlines" 
ON public.deadlines
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND tenant_id = get_user_tenant_id()
);

-- Controller pode DELETAR prazos do tenant
CREATE POLICY "Controllers can delete tenant deadlines" 
ON public.deadlines
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND tenant_id = get_user_tenant_id()
);