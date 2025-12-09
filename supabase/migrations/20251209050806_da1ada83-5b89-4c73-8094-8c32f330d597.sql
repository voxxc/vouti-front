-- Adicionar campos do advogado na tabela oabs_cadastradas
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS email_advogado TEXT;
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS telefone_advogado TEXT;
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS endereco_advogado TEXT;
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS cidade_advogado TEXT;
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS cep_advogado TEXT;
ALTER TABLE public.oabs_cadastradas ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Criar bucket para logos dos advogados
INSERT INTO storage.buckets (id, name, public)
VALUES ('advogado-logos', 'advogado-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Politicas de storage para advogado-logos
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'advogado-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'advogado-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'advogado-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'advogado-logos');

-- Criar tabela de tarefas do processo
CREATE TABLE public.processos_oab_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id UUID NOT NULL REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  fase TEXT,
  data_execucao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processos_oab_tarefas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para processos_oab_tarefas
CREATE POLICY "Users can view their own tarefas"
ON public.processos_oab_tarefas FOR SELECT
USING (auth.uid() = user_id OR tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create tarefas"
ON public.processos_oab_tarefas FOR INSERT
WITH CHECK (auth.uid() = user_id AND tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own tarefas"
ON public.processos_oab_tarefas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tarefas"
ON public.processos_oab_tarefas FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tarefas in tenant"
ON public.processos_oab_tarefas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());

-- Trigger para updated_at
CREATE TRIGGER update_processos_oab_tarefas_updated_at
BEFORE UPDATE ON public.processos_oab_tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();