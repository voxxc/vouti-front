CREATE POLICY "whatsapp_labels_tenant_all"
ON whatsapp_labels
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());