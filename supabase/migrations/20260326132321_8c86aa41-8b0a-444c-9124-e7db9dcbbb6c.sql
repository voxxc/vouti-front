-- project_columns: permitir delete por membros do projeto
CREATE POLICY "Members can delete project columns"
  ON public.project_columns FOR DELETE
  USING (is_project_member(project_id));

-- project_carteiras: permitir delete por membros do tenant
CREATE POLICY "Tenant members can delete project carteiras"
  ON public.project_carteiras FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- client_history: permitir delete por membros do tenant
CREATE POLICY "Tenant members can delete client history"
  ON public.client_history FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- task_history: permitir delete por membros do tenant
CREATE POLICY "Tenant members can delete task history"
  ON public.task_history FOR DELETE
  USING (tenant_id = get_user_tenant_id());