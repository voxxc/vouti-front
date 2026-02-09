-- Política para Super Admin SELECT
CREATE POLICY "superadmin_select_agents" ON public.whatsapp_agents
  FOR SELECT TO public
  USING (is_super_admin(auth.uid()));

-- Política para Super Admin INSERT  
CREATE POLICY "superadmin_insert_agents" ON public.whatsapp_agents
  FOR INSERT TO public
  WITH CHECK (is_super_admin(auth.uid()));

-- Política para Super Admin UPDATE
CREATE POLICY "superadmin_update_agents" ON public.whatsapp_agents
  FOR UPDATE TO public
  USING (is_super_admin(auth.uid()));

-- Política para Super Admin DELETE
CREATE POLICY "superadmin_delete_agents" ON public.whatsapp_agents
  FOR DELETE TO public
  USING (is_super_admin(auth.uid()));