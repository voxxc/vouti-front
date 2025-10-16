-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados Pessoais
  nome_pessoa_fisica TEXT,
  nome_pessoa_juridica TEXT,
  telefone TEXT,
  email TEXT,
  data_nascimento DATE,
  endereco TEXT,
  
  -- Dados Contratuais
  data_fechamento DATE NOT NULL,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valor_contrato NUMERIC(10,2) NOT NULL,
  
  -- Forma de Pagamento
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('a_vista', 'parcelado')),
  valor_entrada NUMERIC(10,2),
  numero_parcelas INTEGER,
  valor_parcela NUMERIC(10,2),
  dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  
  -- Origem
  vendedor TEXT,
  origem_rede_social TEXT,
  origem_tipo TEXT CHECK (origem_tipo IN ('instagram', 'facebook', 'indicacao', 'outro')),
  
  -- Observações
  observacoes TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_clientes_email ON public.clientes(email);
CREATE INDEX idx_clientes_data_fechamento ON public.clientes(data_fechamento);

-- RLS Policies
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.clientes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all clients"
  ON public.clientes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all clients"
  ON public.clientes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela de documentos de clientes
CREATE TABLE public.cliente_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies para documentos
ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents of their clients"
  ON public.cliente_documentos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload documents to their clients"
  ON public.cliente_documentos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their client documents"
  ON public.cliente_documentos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all client documents"
  ON public.cliente_documentos FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar storage bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('cliente-documentos', 'cliente-documentos', false);

-- RLS Policies para o bucket
CREATE POLICY "Users can upload their client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cliente-documentos' AND
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their client documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cliente-documentos' AND
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cliente-documentos' AND
  EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all client documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'cliente-documentos' AND
  has_role(auth.uid(), 'admin'::app_role)
);