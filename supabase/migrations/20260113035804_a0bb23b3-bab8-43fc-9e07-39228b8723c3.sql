-- Tabela de avisos do sistema
CREATE TABLE public.avisos_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT NOT NULL,
  system_type_id UUID REFERENCES public.system_types(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de ciências dos avisos
CREATE TABLE public.avisos_ciencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID REFERENCES public.avisos_sistema(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confirmado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);

-- Enable RLS
ALTER TABLE public.avisos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_ciencia ENABLE ROW LEVEL SECURITY;

-- Policies para avisos_sistema (apenas super admins podem gerenciar)
CREATE POLICY "Super admins podem ver avisos"
  ON public.avisos_sistema FOR SELECT
  USING (true);

CREATE POLICY "Super admins podem criar avisos"
  ON public.avisos_sistema FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins podem atualizar avisos"
  ON public.avisos_sistema FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins podem deletar avisos"
  ON public.avisos_sistema FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

-- Policies para avisos_ciencia
CREATE POLICY "Usuarios podem ver suas ciencias"
  ON public.avisos_ciencia FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem registrar ciencia"
  ON public.avisos_ciencia FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Storage bucket para imagens de avisos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avisos', 'avisos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload de imagens (apenas super admins)
CREATE POLICY "Super admins podem fazer upload de imagens de avisos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avisos' AND EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Imagens de avisos são públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avisos');

CREATE POLICY "Super admins podem deletar imagens de avisos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avisos' AND EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));