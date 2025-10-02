-- Criar tabela para leads de captação
CREATE TABLE public.leads_captacao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  tipo text, -- empresario, agricultor, pecuarista, produtor rural
  status text DEFAULT 'captacao', -- captacao, agendado, agendar, proposta enviada, 1a tentativa, etc
  prioridade text DEFAULT 'a definir', -- 0 a 100k, 101k a 300k, etc
  validado text DEFAULT 'a definir', -- validado, em contato, sem contato, a definir
  uf text,
  responsavel_id uuid,
  user_id uuid NOT NULL,
  origem text DEFAULT 'landing_page',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads_captacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own leads"
ON public.leads_captacao
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads"
ON public.leads_captacao
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
ON public.leads_captacao
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
ON public.leads_captacao
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_captacao_updated_at
BEFORE UPDATE ON public.leads_captacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();