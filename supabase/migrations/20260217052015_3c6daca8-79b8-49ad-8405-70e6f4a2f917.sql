
-- Table for shared conversation access after transfers
CREATE TABLE public.whatsapp_conversation_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  agent_id UUID NOT NULL,
  phone TEXT NOT NULL,
  granted_by_agent_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_whatsapp_conversation_access_agent_phone 
  ON public.whatsapp_conversation_access (agent_id, phone);

CREATE INDEX idx_whatsapp_conversation_access_tenant 
  ON public.whatsapp_conversation_access (tenant_id);

ALTER TABLE public.whatsapp_conversation_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation access for their tenant"
  ON public.whatsapp_conversation_access
  FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can insert conversation access for their tenant"
  ON public.whatsapp_conversation_access
  FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can delete conversation access for their tenant"
  ON public.whatsapp_conversation_access
  FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.is_super_admin(auth.uid()));
