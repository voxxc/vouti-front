-- =============================================
-- VOUTI.BOT RESTRUCTURE: Contacts, Labels, Kanban
-- =============================================

-- 1. Add agent_id to whatsapp_messages for tracking which agent handles each conversation
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_agent 
ON whatsapp_messages(agent_id) WHERE agent_id IS NOT NULL;

-- 2. Table: whatsapp_contacts - Saved contacts from conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for tenant + phone (with NULL tenant support for Super Admin)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone 
ON whatsapp_contacts(tenant_id, phone) WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_contacts_superadmin_phone 
ON whatsapp_contacts(phone) WHERE tenant_id IS NULL;

-- RLS for whatsapp_contacts
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_contacts_tenant_select" ON public.whatsapp_contacts 
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_contacts_tenant_insert" ON public.whatsapp_contacts 
FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_contacts_tenant_update" ON public.whatsapp_contacts 
FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_contacts_tenant_delete" ON public.whatsapp_contacts 
FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

-- 3. Table: whatsapp_labels - Labels/tags for contacts
CREATE TABLE IF NOT EXISTS public.whatsapp_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for tenant + name
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_labels_tenant_name 
ON whatsapp_labels(tenant_id, name) WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_labels_superadmin_name 
ON whatsapp_labels(name) WHERE tenant_id IS NULL;

-- RLS for whatsapp_labels
ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_labels_tenant_select" ON public.whatsapp_labels 
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_labels_admin_all" ON public.whatsapp_labels 
FOR ALL TO authenticated
USING (is_admin_or_controller_in_tenant() OR is_super_admin(auth.uid()));

-- 4. Table: whatsapp_contact_labels - Junction table for contact-label relationship
CREATE TABLE IF NOT EXISTS public.whatsapp_contact_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES whatsapp_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, label_id)
);

-- RLS for whatsapp_contact_labels
ALTER TABLE public.whatsapp_contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_contact_labels_access" ON public.whatsapp_contact_labels 
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_contacts wc 
    WHERE wc.id = contact_id 
    AND (wc.tenant_id = get_user_tenant_id() OR (wc.tenant_id IS NULL AND is_super_admin(auth.uid())))
  )
);

-- 5. Table: whatsapp_kanban_columns - Kanban columns per agent
CREATE TABLE IF NOT EXISTS public.whatsapp_kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  column_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for whatsapp_kanban_columns
ALTER TABLE public.whatsapp_kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_kanban_columns_tenant_select" ON public.whatsapp_kanban_columns 
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_kanban_columns_admin_all" ON public.whatsapp_kanban_columns 
FOR ALL TO authenticated
USING (is_admin_or_controller_in_tenant() OR is_super_admin(auth.uid()));

-- 6. Table: whatsapp_conversation_kanban - Conversation positions in Kanban
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_kanban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  column_id UUID REFERENCES whatsapp_kanban_columns(id) ON DELETE SET NULL,
  card_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for tenant + agent + phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversation_kanban_unique 
ON whatsapp_conversation_kanban(tenant_id, agent_id, phone) WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversation_kanban_superadmin 
ON whatsapp_conversation_kanban(agent_id, phone) WHERE tenant_id IS NULL;

-- RLS for whatsapp_conversation_kanban
ALTER TABLE public.whatsapp_conversation_kanban ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_conversation_kanban_tenant_select" ON public.whatsapp_conversation_kanban 
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

CREATE POLICY "whatsapp_conversation_kanban_tenant_all" ON public.whatsapp_conversation_kanban 
FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id() OR (tenant_id IS NULL AND is_super_admin(auth.uid())));

-- 7. Function to create default Kanban columns for an agent
CREATE OR REPLACE FUNCTION public.create_default_kanban_columns(p_agent_id UUID, p_tenant_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
  VALUES
    (p_tenant_id, p_agent_id, 'Novo Lead', '#3b82f6', 0, true),
    (p_tenant_id, p_agent_id, 'Em Contato', '#f59e0b', 1, true),
    (p_tenant_id, p_agent_id, 'Negociando', '#8b5cf6', 2, true),
    (p_tenant_id, p_agent_id, 'Fechado', '#22c55e', 3, true),
    (p_tenant_id, p_agent_id, 'Perdido', '#ef4444', 4, true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 8. Trigger to auto-create Kanban columns when agent is created
CREATE OR REPLACE FUNCTION public.trigger_create_agent_kanban_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM create_default_kanban_columns(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agent_created_create_kanban ON whatsapp_agents;
CREATE TRIGGER on_agent_created_create_kanban
AFTER INSERT ON whatsapp_agents
FOR EACH ROW
EXECUTE FUNCTION trigger_create_agent_kanban_columns();

-- 9. Trigger to update updated_at on whatsapp_contacts
CREATE OR REPLACE FUNCTION public.update_whatsapp_contacts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_whatsapp_contacts_updated_at ON whatsapp_contacts;
CREATE TRIGGER update_whatsapp_contacts_updated_at
BEFORE UPDATE ON whatsapp_contacts
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_contacts_updated_at();

-- 10. Trigger to update updated_at on whatsapp_conversation_kanban
CREATE OR REPLACE FUNCTION public.update_whatsapp_conversation_kanban_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_whatsapp_conversation_kanban_updated_at ON whatsapp_conversation_kanban;
CREATE TRIGGER update_whatsapp_conversation_kanban_updated_at
BEFORE UPDATE ON whatsapp_conversation_kanban
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_conversation_kanban_updated_at();