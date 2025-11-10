-- Criar tabela reuniao_arquivos
CREATE TABLE IF NOT EXISTS reuniao_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_reuniao_arquivos_reuniao_id ON reuniao_arquivos(reuniao_id);
CREATE INDEX IF NOT EXISTS idx_reuniao_arquivos_uploaded_by ON reuniao_arquivos(uploaded_by);

-- Habilitar RLS
ALTER TABLE reuniao_arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tabela
CREATE POLICY "Admins can manage all reuniao arquivos"
  ON reuniao_arquivos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create arquivos in their reunioes"
  ON reuniao_arquivos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM reunioes r 
      WHERE r.id = reuniao_arquivos.reuniao_id 
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view arquivos of their reunioes"
  ON reuniao_arquivos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reunioes r 
      WHERE r.id = reuniao_arquivos.reuniao_id 
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own arquivos"
  ON reuniao_arquivos FOR DELETE
  USING (auth.uid() = uploaded_by);

-- Criar bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('reuniao-attachments', 'reuniao-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para storage
CREATE POLICY "Users can upload to their reunioes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reuniao-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their reuniao files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reuniao-attachments');

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reuniao-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Comentários
COMMENT ON TABLE reuniao_arquivos IS 'Arquivos anexados às reuniões';
COMMENT ON COLUMN reuniao_arquivos.reuniao_id IS 'ID da reunião';
COMMENT ON COLUMN reuniao_arquivos.file_path IS 'Caminho do arquivo no storage';
COMMENT ON COLUMN reuniao_arquivos.uploaded_by IS 'Usuário que enviou o arquivo';