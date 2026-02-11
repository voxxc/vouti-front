
-- 1. Add columns to whatsapp_contacts
ALTER TABLE public.whatsapp_contacts 
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- 2. Create whatsapp_contact_notes table
CREATE TABLE public.whatsapp_contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_contact_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "tenant_select" ON public.whatsapp_contact_notes
  FOR SELECT USING (
    tenant_id = get_user_tenant_id() OR 
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "tenant_insert" ON public.whatsapp_contact_notes
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id() OR 
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

CREATE POLICY "tenant_delete" ON public.whatsapp_contact_notes
  FOR DELETE USING (
    tenant_id = get_user_tenant_id() OR 
    (tenant_id IS NULL AND is_super_admin(auth.uid()))
  );

-- Index for performance
CREATE INDEX idx_whatsapp_contact_notes_phone ON public.whatsapp_contact_notes(contact_phone);
CREATE INDEX idx_whatsapp_contact_notes_tenant ON public.whatsapp_contact_notes(tenant_id);
