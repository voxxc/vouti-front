-- Create reunioes table
CREATE TABLE public.reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_email TEXT,
  status TEXT NOT NULL DEFAULT '1ª reunião',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reunioes_user_id ON public.reunioes(user_id);
CREATE INDEX idx_reunioes_data ON public.reunioes(data);
CREATE INDEX idx_reunioes_status ON public.reunioes(status);

-- Enable RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reunioes
CREATE POLICY "Admins can manage all reunioes"
  ON public.reunioes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own reunioes"
  ON public.reunioes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reunioes"
  ON public.reunioes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reunioes"
  ON public.reunioes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reunioes"
  ON public.reunioes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create reuniao_comentarios table
CREATE TABLE public.reuniao_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_reuniao_comentarios_reuniao_id ON public.reuniao_comentarios(reuniao_id);

-- Enable RLS
ALTER TABLE public.reuniao_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reuniao_comentarios
CREATE POLICY "Admins can manage all comentarios"
  ON public.reuniao_comentarios
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view comentarios of their reunioes"
  ON public.reuniao_comentarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reunioes
      WHERE reunioes.id = reuniao_comentarios.reuniao_id
        AND reunioes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comentarios on their reunioes"
  ON public.reuniao_comentarios
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.reunioes
      WHERE reunioes.id = reuniao_comentarios.reuniao_id
        AND reunioes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comentarios"
  ON public.reuniao_comentarios
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own comentarios"
  ON public.reuniao_comentarios
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_reunioes_updated_at
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reuniao_comentarios_updated_at
  BEFORE UPDATE ON public.reuniao_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();