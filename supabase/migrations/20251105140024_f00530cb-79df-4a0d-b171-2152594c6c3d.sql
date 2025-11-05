-- ==================== TABELA DE COMENTÁRIOS DE CLIENTES ====================
CREATE TABLE IF NOT EXISTS public.reuniao_cliente_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.reuniao_clientes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reuniao_cliente_comentarios_cliente_id ON public.reuniao_cliente_comentarios(cliente_id);
CREATE INDEX idx_reuniao_cliente_comentarios_user_id ON public.reuniao_cliente_comentarios(user_id);
CREATE INDEX idx_reuniao_cliente_comentarios_created_at ON public.reuniao_cliente_comentarios(created_at DESC);

-- ==================== TABELA DE ARQUIVOS DE CLIENTES ====================
CREATE TABLE IF NOT EXISTS public.reuniao_cliente_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.reuniao_clientes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reuniao_cliente_arquivos_cliente_id ON public.reuniao_cliente_arquivos(cliente_id);
CREATE INDEX idx_reuniao_cliente_arquivos_uploaded_by ON public.reuniao_cliente_arquivos(uploaded_by);

-- ==================== STORAGE BUCKET ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reuniao-cliente-attachments', 'reuniao-cliente-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ==================== RLS POLICIES - COMENTÁRIOS ====================
ALTER TABLE public.reuniao_cliente_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their clients"
  ON public.reuniao_cliente_comentarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reuniao_clientes rc
      WHERE rc.id = reuniao_cliente_comentarios.cliente_id
        AND rc.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can create comments on their clients"
  ON public.reuniao_cliente_comentarios FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.reuniao_clientes rc
      WHERE rc.id = reuniao_cliente_comentarios.cliente_id
        AND rc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.reuniao_cliente_comentarios FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all client comments"
  ON public.reuniao_cliente_comentarios FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== RLS POLICIES - ARQUIVOS ====================
ALTER TABLE public.reuniao_cliente_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files of their clients"
  ON public.reuniao_cliente_arquivos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reuniao_clientes rc
      WHERE rc.id = reuniao_cliente_arquivos.cliente_id
        AND rc.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can upload files to their clients"
  ON public.reuniao_cliente_arquivos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.reuniao_clientes rc
      WHERE rc.id = reuniao_cliente_arquivos.cliente_id
        AND rc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own uploaded files"
  ON public.reuniao_cliente_arquivos FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all client files"
  ON public.reuniao_cliente_arquivos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== STORAGE POLICIES ====================
CREATE POLICY "Users can view client attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reuniao-cliente-attachments'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Users can upload client attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reuniao-cliente-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own client attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reuniao-cliente-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==================== TRIGGERS ====================
CREATE TRIGGER update_reuniao_cliente_comentarios_updated_at
  BEFORE UPDATE ON public.reuniao_cliente_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();