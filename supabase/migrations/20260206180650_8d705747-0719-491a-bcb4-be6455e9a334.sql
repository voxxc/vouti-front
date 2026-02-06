-- Tabela de documentos
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  conteudo_html TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  responsavel_id UUID,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_documentos_tenant_id ON public.documentos(tenant_id);
CREATE INDEX idx_documentos_cliente_id ON public.documentos(cliente_id);
CREATE INDEX idx_documentos_projeto_id ON public.documentos(projeto_id);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando get_user_tenant_id() (funcao ja existente)
CREATE POLICY "tenant_select_documentos" ON public.documentos
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert_documentos" ON public.documentos
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_update_documentos" ON public.documentos
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete_documentos" ON public.documentos
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Trigger para updated_at
CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();