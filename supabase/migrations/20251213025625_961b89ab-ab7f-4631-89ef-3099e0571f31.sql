-- ============================================
-- COLABORADORES E CUSTOS - MÓDULO FINANCEIRO
-- ============================================

-- 1. TABELA DE COLABORADORES
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  nome_completo TEXT NOT NULL,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj TEXT,
  cargo TEXT,
  tipo_vinculo TEXT CHECK (tipo_vinculo IN ('CLT', 'PJ', 'Estagio', 'Freelancer')),
  salario_base NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'mensal' CHECK (forma_pagamento IN ('mensal', 'hora', 'demanda')),
  dia_pagamento INTEGER,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_contratacao DATE,
  data_nascimento DATE,
  endereco TEXT,
  email TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaboradores_tenant_select" ON public.colaboradores
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaboradores_tenant_insert" ON public.colaboradores
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaboradores_tenant_update" ON public.colaboradores
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaboradores_tenant_delete" ON public.colaboradores
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Trigger para updated_at
CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TABELA DE REAJUSTES SALARIAIS
CREATE TABLE public.colaborador_reajustes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  valor_anterior NUMERIC NOT NULL,
  valor_novo NUMERIC NOT NULL,
  data_reajuste DATE NOT NULL,
  motivo TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaborador_reajustes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaborador_reajustes_tenant_select" ON public.colaborador_reajustes
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_reajustes_tenant_insert" ON public.colaborador_reajustes
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_reajustes_tenant_update" ON public.colaborador_reajustes
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_reajustes_tenant_delete" ON public.colaborador_reajustes
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 3. TABELA DE VALES E ADIANTAMENTOS
CREATE TABLE public.colaborador_vales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('vale', 'adiantamento', 'reembolso')),
  valor NUMERIC NOT NULL,
  data DATE NOT NULL,
  descricao TEXT,
  vincular_salario BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'descontado')),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaborador_vales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaborador_vales_tenant_select" ON public.colaborador_vales
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_vales_tenant_insert" ON public.colaborador_vales
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_vales_tenant_update" ON public.colaborador_vales
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_vales_tenant_delete" ON public.colaborador_vales
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 4. TABELA DE COMENTARIOS DO COLABORADOR
CREATE TABLE public.colaborador_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaborador_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaborador_comentarios_tenant_select" ON public.colaborador_comentarios
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_comentarios_tenant_insert" ON public.colaborador_comentarios
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_comentarios_tenant_update" ON public.colaborador_comentarios
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_comentarios_tenant_delete" ON public.colaborador_comentarios
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE TRIGGER update_colaborador_comentarios_updated_at
  BEFORE UPDATE ON public.colaborador_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. TABELA DE DOCUMENTOS DO COLABORADOR
CREATE TABLE public.colaborador_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  tipo_documento TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaborador_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colaborador_documentos_tenant_select" ON public.colaborador_documentos
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_documentos_tenant_insert" ON public.colaborador_documentos
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_documentos_tenant_update" ON public.colaborador_documentos
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_documentos_tenant_delete" ON public.colaborador_documentos
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 6. TABELA DE CATEGORIAS DE CUSTOS
CREATE TABLE public.custo_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custo_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custo_categorias_tenant_select" ON public.custo_categorias
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_categorias_tenant_insert" ON public.custo_categorias
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_categorias_tenant_update" ON public.custo_categorias
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_categorias_tenant_delete" ON public.custo_categorias
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 7. TABELA PRINCIPAL DE CUSTOS
CREATE TABLE public.custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES public.custo_categorias(id),
  valor NUMERIC NOT NULL,
  tipo TEXT CHECK (tipo IN ('fixo', 'variavel')),
  data DATE NOT NULL,
  forma_pagamento TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  parcelado BOOLEAN DEFAULT false,
  numero_parcelas INTEGER,
  observacoes TEXT,
  recorrente BOOLEAN DEFAULT false,
  periodicidade TEXT,
  data_inicial DATE,
  data_final DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custos_tenant_select" ON public.custos
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custos_tenant_insert" ON public.custos
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custos_tenant_update" ON public.custos
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custos_tenant_delete" ON public.custos
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE TRIGGER update_custos_updated_at
  BEFORE UPDATE ON public.custos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. TABELA DE PARCELAS DE CUSTOS
CREATE TABLE public.custo_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_id UUID NOT NULL REFERENCES public.custos(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custo_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custo_parcelas_tenant_select" ON public.custo_parcelas
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_parcelas_tenant_insert" ON public.custo_parcelas
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_parcelas_tenant_update" ON public.custo_parcelas
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_parcelas_tenant_delete" ON public.custo_parcelas
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 9. TABELA DE COMPROVANTES DE CUSTOS
CREATE TABLE public.custo_comprovantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_id UUID NOT NULL REFERENCES public.custos(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custo_comprovantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custo_comprovantes_tenant_select" ON public.custo_comprovantes
  FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_comprovantes_tenant_insert" ON public.custo_comprovantes
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_comprovantes_tenant_update" ON public.custo_comprovantes
  FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "custo_comprovantes_tenant_delete" ON public.custo_comprovantes
  FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 10. STORAGE BUCKET PARA DOCUMENTOS FINANCEIROS
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-documents', 'financial-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
CREATE POLICY "financial_docs_tenant_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'financial-documents' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "financial_docs_tenant_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'financial-documents' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "financial_docs_tenant_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'financial-documents' AND 
    auth.uid() IS NOT NULL
  );

-- 11. FUNCAO PARA CRIAR CATEGORIAS PADRAO POR TENANT
CREATE OR REPLACE FUNCTION public.criar_categorias_custos_padrao(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.custo_categorias (tenant_id, nome, cor, padrao) VALUES
    (p_tenant_id, 'Compras', '#3b82f6', true),
    (p_tenant_id, 'Diaristas', '#8b5cf6', true),
    (p_tenant_id, 'Servicos', '#ec4899', true),
    (p_tenant_id, 'Aluguel', '#f97316', true),
    (p_tenant_id, 'Internet / Telefone', '#14b8a6', true),
    (p_tenant_id, 'Energia / Agua', '#eab308', true),
    (p_tenant_id, 'Despesas Gerais', '#6b7280', true)
  ON CONFLICT DO NOTHING;
END;
$$;