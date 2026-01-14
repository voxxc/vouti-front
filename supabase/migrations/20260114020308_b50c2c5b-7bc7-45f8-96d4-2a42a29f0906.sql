-- Tabela para comentários de etapas
CREATE TABLE public.project_etapa_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES project_protocolo_etapas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tabela para arquivos de etapas
CREATE TABLE public.project_etapa_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES project_protocolo_etapas(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Tabela para histórico de etapas
CREATE TABLE public.project_etapa_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES project_protocolo_etapas(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.project_etapa_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_etapa_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_etapa_history ENABLE ROW LEVEL SECURITY;

-- Policies para comentários
CREATE POLICY "Users can view etapa comments in their tenant" ON public.project_etapa_comments
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert etapa comments in their tenant" ON public.project_etapa_comments
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own etapa comments" ON public.project_etapa_comments
  FOR UPDATE USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete their own etapa comments" ON public.project_etapa_comments
  FOR DELETE USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- Policies para arquivos
CREATE POLICY "Users can view etapa files in their tenant" ON public.project_etapa_files
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert etapa files in their tenant" ON public.project_etapa_files
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete etapa files in their tenant" ON public.project_etapa_files
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Policies para histórico
CREATE POLICY "Users can view etapa history in their tenant" ON public.project_etapa_history
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert etapa history in their tenant" ON public.project_etapa_history
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- Trigger para updated_at nos comentários
CREATE OR REPLACE FUNCTION public.update_project_etapa_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_project_etapa_comments_updated_at
  BEFORE UPDATE ON public.project_etapa_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_etapa_comments_updated_at();

-- Índices para performance
CREATE INDEX idx_project_etapa_comments_etapa_id ON public.project_etapa_comments(etapa_id);
CREATE INDEX idx_project_etapa_files_etapa_id ON public.project_etapa_files(etapa_id);
CREATE INDEX idx_project_etapa_history_etapa_id ON public.project_etapa_history(etapa_id);