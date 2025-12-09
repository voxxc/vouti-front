-- Create table for process attachments
CREATE TABLE public.processos_oab_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id UUID NOT NULL REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  attachment_id TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  extension TEXT,
  status TEXT DEFAULT 'done',
  content_description TEXT,
  is_private BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(processo_oab_id, attachment_id)
);

-- Enable RLS
ALTER TABLE public.processos_oab_anexos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view anexos in tenant"
ON public.processos_oab_anexos FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create anexos in tenant"
ON public.processos_oab_anexos FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage tenant anexos"
ON public.processos_oab_anexos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- Index for faster queries
CREATE INDEX idx_processos_oab_anexos_processo ON public.processos_oab_anexos(processo_oab_id);