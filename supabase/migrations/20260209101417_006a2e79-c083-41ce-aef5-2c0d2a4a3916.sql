-- Remover policies antigas
DROP POLICY IF EXISTS "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_insert" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_update" ON public.whatsapp_lead_triggers;
DROP POLICY IF EXISTS "whatsapp_lead_triggers_delete" ON public.whatsapp_lead_triggers;

-- Criar policies corrigidas que permitem Super Admin acessar registros com tenant_id NULL
CREATE POLICY "whatsapp_lead_triggers_select" ON public.whatsapp_lead_triggers
  FOR SELECT USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_insert" ON public.whatsapp_lead_triggers
  FOR INSERT WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_update" ON public.whatsapp_lead_triggers
  FOR UPDATE USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "whatsapp_lead_triggers_delete" ON public.whatsapp_lead_triggers
  FOR DELETE USING (
    (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id())
    OR
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );