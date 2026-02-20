
-- Tabela whatsapp_commanders
CREATE TABLE public.whatsapp_commanders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  agent_id UUID REFERENCES public.whatsapp_agents(id),
  phone_number TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone_number)
);

ALTER TABLE public.whatsapp_commanders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view commanders"
  ON public.whatsapp_commanders FOR SELECT
  USING (
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
    OR user_belongs_to_tenant(tenant_id)
  );

CREATE POLICY "Admin/controller can manage commanders"
  ON public.whatsapp_commanders FOR ALL
  USING (
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
    OR (tenant_id IS NOT NULL AND is_admin_or_controller_in_tenant() AND user_belongs_to_tenant(tenant_id))
  );

CREATE TRIGGER update_whatsapp_commanders_updated_at
  BEFORE UPDATE ON public.whatsapp_commanders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
